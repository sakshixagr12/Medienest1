'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { createClient } from '@/lib/supabase/client';
import { useClinic } from '@/context/ClinicContext';
import { getLocalTodayStr } from '@/lib/utils';
import styles from './page.module.css';
import docStyles from '../doctor-dashboard/page.module.css';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';

const priorityConfig: Record<string, { label: string; color: string; bg: string }> = {
  urgent: { label: '🔴 Urgent', color: '#ef4444', bg: '#fff1f2' },
  elderly: { label: '🟡 Elderly', color: '#f59e0b', bg: '#fffbeb' },
  normal: { label: '⚪ Normal', color: '#94a3b8', bg: '#f8fafc' },
};

interface QueueEntry {
  id: string;
  patient_id: string;
  patient_name: string;
  token_number: number;
  status: 'waiting' | 'serving' | 'done' | 'skipped';
  priority: 'normal' | 'urgent' | 'elderly';
  created_at: string;
  completed_at: string | null;
  notes: string | null;
  patients?: { name?: string; age?: number; gender?: string; contact?: string };
}

export default function FrontDeskPage() {
  const { clinic, doctors } = useClinic();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  // ── Queue state ──────────────────────────────────────────────────────
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [doneQueue, setDoneQueue] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Drag-and-drop state ──────────────────────────────────────────────
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  // ── Check-in modal state ─────────────────────────────────────────────
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [ptPhone, setPtPhone] = useState('');
  const [ptName, setPtName] = useState('');
  const [ptAge, setPtAge] = useState('');
  const [ptSex, setPtSex] = useState('Male');
  const [ptWeight, setPtWeight] = useState('');
  const [ptBloodGroup, setPtBloodGroup] = useState('');
  const [ptAddress, setPtAddress] = useState('');
  const [checkInPriority, setCheckInPriority] = useState<'normal' | 'urgent' | 'elderly'>('normal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // ── Fetch queue (two-step: queue rows + patient data) ────────────────
  const fetchQueue = useCallback(async () => {
    if (!clinic?.id) return;
    const todayStr = getLocalTodayStr();
    try {
      // Active
      const { data: active } = await supabase
        .from('doctor_queue').select('*')
        .eq('clinic_id', clinic.id)
        .eq('queue_date', todayStr)
        .in('status', ['waiting', 'serving'])
        .order('token_number', { ascending: true });

      // Done
      const { data: done } = await supabase
        .from('doctor_queue').select('*')
        .eq('clinic_id', clinic.id)
        .eq('queue_date', todayStr)
        .in('status', ['done', 'skipped'])
        .order('completed_at', { ascending: false })
        .limit(30);

      // Fetch patient details separately
      const allRows = [...(active || []), ...(done || [])];
      const ids = [...new Set(allRows.map((r: any) => r.patient_id).filter(Boolean))];
      const { data: ptRows } = ids.length
        ? await supabase.from('patients').select('id, name, gender, age, contact').in('id', ids)
        : { data: [] };
      const ptMap: Record<string, any> = {};
      ptRows?.forEach((p: any) => { ptMap[p.id] = p; });

      const merge = (rows: any[]) => rows.map((r: any) => ({
        ...r,
        patients: ptMap[r.patient_id] ?? { name: r.patient_name ?? 'Unknown' }
      }));

      setQueue(merge(active || []));
      setDoneQueue(merge(done || []));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [supabase, clinic?.id]);

  // ── Realtime + polling ───────────────────────────────────────────────
  useEffect(() => {
    if (!clinic?.id) return;
    fetchQueue();
    const channel = supabase
      .channel('front-desk-live-queue')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'doctor_queue',
        filter: `clinic_id=eq.${clinic.id}`
      }, fetchQueue)
      .subscribe();
    const poll = setInterval(fetchQueue, 10000);
    return () => { supabase.removeChannel(channel); clearInterval(poll); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinic?.id]);

  // ── Phone search for check-in ───────────────────────────────────────
  useEffect(() => {
    if (ptPhone.length < 3) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      const { data } = await supabase.from('patients').select('*')
        .eq('clinic_id', clinic?.id || '')
        .ilike('contact', `%${ptPhone}%`)
        .limit(5);
      setSearchResults(data || []);
      setIsSearching(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [ptPhone, supabase, clinic?.id]);

  const resetCheckIn = () => {
    setPtPhone(''); setPtName(''); setPtAge(''); setPtSex('Male');
    setPtWeight(''); setPtBloodGroup(''); setPtAddress('');
    setCheckInPriority('normal'); setSearchResults([]); setShowDropdown(false);
  };

  const handleSelectPatient = (p: any) => {
    setPtName(p.name || ''); setPtPhone(p.contact || '');
    setPtAge(p.age || ''); setPtSex(p.gender || 'Male');
    setPtWeight(p.weight || ''); setPtBloodGroup(p.blood_group || '');
    setPtAddress(p.address || ''); setSearchResults([]);
  };

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ptName || !ptPhone || !clinic?.id) return;
    setIsSubmitting(true);
    try {
      const normalizedName = ptName.trim().toUpperCase();
      const cleanPhone = ptPhone.replace(/\D/g, '').slice(-10);

      const { data: existing } = await supabase.from('patients').select('id')
        .eq('name', normalizedName).eq('contact', cleanPhone).limit(1);

      let patientId: string;
      if (existing && existing.length > 0) {
        patientId = existing[0].id;
        await supabase.from('patients').update({
          age: ptAge, gender: ptSex,
          weight: ptWeight || null, blood_group: ptBloodGroup.toUpperCase() || null,
          address: ptAddress || null, clinic_id: clinic.id,
        }).eq('id', patientId);
      } else {
        const { data: neu, error: cErr } = await supabase.from('patients').insert([{
          name: normalizedName, contact: cleanPhone, age: ptAge, gender: ptSex,
          weight: ptWeight || null, blood_group: ptBloodGroup.toUpperCase() || null,
          address: ptAddress || null, clinic_id: clinic.id,
        }]).select().single();
        if (cErr) throw cErr;
        patientId = neu.id;
      }

      // Get next token number for today
      const todayStr = getLocalTodayStr();
      const { data: maxTok } = await supabase.from('doctor_queue')
        .select('token_number').eq('queue_date', todayStr).eq('clinic_id', clinic.id)
        .order('token_number', { ascending: false }).limit(1);
      const nextToken = (maxTok?.[0]?.token_number ?? 0) + 1;

      const { error: qErr } = await supabase.from('doctor_queue').insert({
        patient_id: patientId,
        patient_name: normalizedName,
        token_number: nextToken,
        priority: checkInPriority,
        status: 'waiting',
        queue_date: todayStr,
        clinic_id: clinic.id,
      });
      if (qErr) throw qErr;

      setIsCheckInOpen(false);
      resetCheckIn();
    } catch (err: any) {
      console.error('Check-in error:', err);
      const errMsg = err.message || err.details || 'Check-in failed';
      alert(`Failed to check-in: ${errMsg}. Please check if you have permissions.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Queue actions ───────────────────────────────────────────────────
  const updateStatus = async (id: string, status: string) => {
    setActionId(id);
    try {
      await supabase.from('doctor_queue')
        .update({ status, completed_at: ['done', 'skipped'].includes(status) ? new Date().toISOString() : null })
        .eq('id', id);
    } finally { setActionId(null); }
  };

  const updatePriority = async (id: string, p: string) => {
    setActionId(id);
    try {
      await supabase.from('doctor_queue').update({ priority: p }).eq('id', id);
    } finally { setActionId(null); }
  };

  const removeEntry = async (id: string) => {
    setActionId(id);
    try { await supabase.from('doctor_queue').delete().eq('id', id); }
    finally { setActionId(null); }
  };

  // ── Drag-and-drop reorder ───────────────────────────────────────────
  const waiting = queue.filter(q => q.status === 'waiting');
  const serving = queue.find(q => q.status === 'serving');

  const handleDragStart = (idx: number, id: string) => { dragItem.current = idx; setDragging(id); };
  const handleDragEnter = (idx: number, id: string) => { dragOverItem.current = idx; setDragOver(id); };
  const handleDragEnd = () => { setDragging(null); setDragOver(null); };

  const handleDrop = async () => {
    const from = dragItem.current, to = dragOverItem.current;
    if (from === null || to === null || from === to) { handleDragEnd(); return; }

    // 1. Reorder the waiting list
    const reordered = [...waiting];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);

    // 2. Extract and sort existing token numbers to maintain the same sequence
    // This prevents tokens from resetting to 1/2 when rearranging.
    const tokens = waiting.map(q => q.token_number).sort((a, b) => a - b);

    // 3. Map tokens back to the new order
    const updated = reordered.map((e, i) => ({ ...e, token_number: tokens[i] }));

    setQueue([...(serving ? [serving] : []), ...updated]);
    handleDragEnd();
    try {
      await Promise.all(updated.map(e =>
        supabase.from('doctor_queue').update({ token_number: e.token_number }).eq('id', e.id)
      ));
    } catch { fetchQueue(); }
  };

  // ── Metrics ─────────────────────────────────────────────────────────
  const urgentCount = queue.filter(q => q.priority === 'urgent' && q.status === 'waiting').length;

  return (
    <DashboardLayout>
      <div className={styles.dashboardHeader}>
        <div className={styles.headerTitleGroup}>
          <h2>Live Queue</h2>
          <p className={styles.headerSubtext}>
            Real-time patient flow · {waiting.length} waiting · {doneQueue.length} completed today
          </p>
        </div>
        <button onClick={() => setIsCheckInOpen(true)} className={styles.checkInBtn}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
            <line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" />
          </svg>
          Check-in Patient
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Waiting', val: waiting.length, color: '#f59e0b', bg: '#fffbeb' },
          { label: 'Urgent', val: urgentCount, color: '#ef4444', bg: '#fff1f2' },
          { label: 'Serving', val: serving ? 1 : 0, color: '#10b981', bg: '#ecfdf5' },
          { label: 'Done Today', val: doneQueue.length, color: '#64748b', bg: '#f1f5f9' },
        ].map(s => (
          <div key={s.label} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: s.bg, borderRadius: 30, padding: '7px 16px',
            fontWeight: 800, fontSize: 13, color: s.color,
          }}>
            <span style={{ fontSize: 18, fontWeight: 900 }}>{s.val}</span>
            <span style={{ fontWeight: 600, opacity: 0.8 }}>{s.label}</span>
          </div>
        ))}
        <button
          onClick={() => setShowDone(p => !p)}
          style={{
            marginLeft: 'auto', background: showDone ? 'var(--sanctuary-primary)' : 'transparent',
            color: showDone ? '#fff' : 'var(--sanctuary-ink-l)',
            border: '1.5px solid rgba(23,3,55,0.1)', borderRadius: 30,
            padding: '7px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}
        >
          {showDone ? 'Hide' : 'Show'} Completed
        </button>
      </div>

      {error && <div style={{ padding: '12px 16px', background: '#fee2e2', borderRadius: 12, color: '#dc2626', marginBottom: 16, fontSize: 13 }}>⚠️ {error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
        {serving && (
          <div className={styles.nowServingCard}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900, fontSize: 20, flexShrink: 0,
              boxShadow: '0 4px 12px rgba(139,92,246,0.3)'
            }}>
              {serving.patients?.name?.[0] ?? '?'}
            </div>
            <div className={styles.cardContent}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, color: '#7c3aed', textTransform: 'uppercase' }}>Now Serving</span>
                <span style={{ background: '#7c3aed', color: '#fff', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 900 }}>#{serving.token_number}</span>
              </div>
              <p className={styles.cardName} style={{ fontSize: 18 }}>{serving.patients?.name ?? 'Unknown'}</p>
              <p className={styles.cardMeta} style={{ color: '#6d28d9', fontWeight: 600 }}>
                {serving.patients?.age}Y · {serving.patients?.gender} · {priorityConfig[serving.priority]?.label}
              </p>
            </div>
            <div className={styles.cardActions}>
              <button onClick={() => updateStatus(serving.id, 'done')} disabled={actionId === serving.id}
                style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 20px', fontWeight: 800, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 10px rgba(16,185,129,0.2)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                Complete
              </button>
              <button onClick={() => removeEntry(serving.id)} disabled={!!actionId}
                style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 12, padding: '10px 14px', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>✕</button>
            </div>
          </div>
        )}

        {waiting.length === 0 && !serving && !loading && (
          <div style={{ padding: '48px', textAlign: 'center', background: '#fff', borderRadius: 18, border: '1px solid rgba(23,3,55,0.05)' }}>
            <p style={{ color: 'var(--sanctuary-ink-l)', fontSize: 15 }}>Queue is empty. Ready for patient check-ins.</p>
          </div>
        )}

        {loading && (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--sanctuary-ink-l)' }}>Loading queue…</div>
        )}

        {waiting.map((entry, idx) => (
          <div
            key={entry.id}
            draggable
            onDragStart={() => handleDragStart(idx, entry.id)}
            onDragEnter={() => handleDragEnter(idx, entry.id)}
            onDragOver={e => e.preventDefault()}
            onDragEnd={handleDragEnd}
            onDrop={handleDrop}
            className={styles.queueCard}
            style={{
              borderTop: `1px solid ${dragOver === entry.id && dragging !== entry.id ? 'var(--sanctuary-primary)' : 'rgba(23,3,55,0.06)'}`,
              borderRight: `1px solid ${dragOver === entry.id && dragging !== entry.id ? 'var(--sanctuary-primary)' : 'rgba(23,3,55,0.06)'}`,
              borderBottom: `1px solid ${dragOver === entry.id && dragging !== entry.id ? 'var(--sanctuary-primary)' : 'rgba(23,3,55,0.06)'}`,
              borderLeft: `4px solid ${priorityConfig[entry.priority]?.color ?? '#94a3b8'}`,
              opacity: dragging === entry.id ? 0.4 : 1,
            }}
          >
            <div className={styles.tokenBadge} style={{
              background: priorityConfig[entry.priority]?.bg ?? '#f8fafc',
              color: priorityConfig[entry.priority]?.color ?? '#94a3b8',
              border: `1.5px solid ${priorityConfig[entry.priority]?.color ?? '#e2e8f0'}22`,
            }}>
              #{entry.token_number}
            </div>
            <div className={styles.cardContent}>
              <p className={styles.cardName}>
                {entry.patients?.name ?? entry.patient_name ?? 'Unknown'}
              </p>
              <p className={styles.cardMeta}>
                <span style={{ color: priorityConfig[entry.priority]?.color, fontWeight: 700 }}>{priorityConfig[entry.priority]?.label}</span>
                {' · '}Pos. {idx + 1}
                {' · '}{new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div className={styles.cardActions}>
              <select
                value={entry.priority}
                onChange={e => updatePriority(entry.id, e.target.value)}
                disabled={!!actionId}
                style={{ fontSize: 12, borderRadius: 8, border: '1.5px solid rgba(23,3,55,0.1)', padding: '6px 10px', fontWeight: 600, cursor: 'pointer', background: '#fff' }}
              >
                <option value="normal">Normal</option><option value="elderly">Elderly</option><option value="urgent">Urgent</option>
              </select>
              <button onClick={() => updateStatus(entry.id, 'serving')} disabled={!!actionId || !!serving}
                style={{ background: '#f5f3ff', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.1)', borderRadius: 10, padding: '8px 16px', fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.2s' }}>Call</button>
              <button onClick={() => removeEntry(entry.id)} disabled={!!actionId}
                style={{ background: '#fff1f2', color: '#e11d48', border: '1px solid rgba(225,29,72,0.1)', borderRadius: 10, padding: '8px 12px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>✕</button>
            </div>
          </div>
        ))}

        {showDone && doneQueue.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 18, border: '1px solid rgba(23,3,55,0.05)', overflow: 'hidden', marginTop: 8 }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(23,3,55,0.05)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--sanctuary-primary)' }}>✅ Completed Today</span>
              <span style={{ fontSize: 12, color: 'var(--sanctuary-ink-l)' }}>{doneQueue.length} patients</span>
            </div>
            {doneQueue.map((p, idx) => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px',
                borderBottom: idx < doneQueue.length - 1 ? '1px solid rgba(23,3,55,0.04)' : 'none'
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  background: p.status === 'done' ? '#ecfdf5' : '#f1f5f9',
                  color: p.status === 'done' ? '#10b981' : '#94a3b8',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 11
                }}>#{p.token_number}</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--sanctuary-primary)', margin: 0 }}>{p.patients?.name ?? p.patient_name ?? 'Unknown'}</p>
                  <p style={{ fontSize: 11, color: 'var(--sanctuary-ink-l)', margin: 0 }}>
                    {p.status === 'done' ? '✅ Done' : '⏭ Skipped'}
                    {p.completed_at ? ` · ${new Date(p.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        <Link href="/portal/front-desk/patients" style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: '#fff', border: '1.5px solid rgba(23,3,55,0.06)', borderRadius: 14,
          padding: '16px 20px', textDecoration: 'none', color: 'var(--sanctuary-primary)', fontWeight: 800, fontSize: 13,
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
        }}>
          <div style={{ background: '#ecfdf5', color: '#10b981', padding: 8, borderRadius: 10 }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div>
          Patient Lobby
        </Link>
        <button onClick={() => setIsCheckInOpen(true)} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: '#fff', border: '1.5px solid rgba(23,3,55,0.06)', borderRadius: 14,
          padding: '16px 20px', textDecoration: 'none', color: 'var(--sanctuary-primary)', fontWeight: 800, fontSize: 13,
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)', cursor: 'pointer', textAlign: 'left'
        }}>
          <div style={{ background: '#fff1f2', color: '#e11d48', padding: 8, borderRadius: 10 }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg></div>
          Register Patient
        </button>
        <Link href="/portal/billing-receipts" style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: '#fff', border: '1.5px solid rgba(23,3,55,0.06)', borderRadius: 14,
          padding: '16px 20px', textDecoration: 'none', color: 'var(--sanctuary-primary)', fontWeight: 800, fontSize: 13,
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
        }}>
          <div style={{ background: '#eff6ff', color: '#3b82f6', padding: 8, borderRadius: 10 }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg></div>
          Billing & Payments
        </Link>
        <Link href="/portal/front-desk/clinic-settings" style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: '#fff', border: '1.5px solid rgba(23,3,55,0.06)', borderRadius: 14,
          padding: '16px 20px', textDecoration: 'none', color: 'var(--sanctuary-primary)', fontWeight: 800, fontSize: 13,
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
        }}>
          <div style={{ background: '#f5f3ff', color: '#8b5cf6', padding: 8, borderRadius: 10 }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.80.31l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .31-1.80 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.31-1.8l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.8.31 1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.8-.31l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.31 1.80 1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></div>
          Clinic Settings
        </Link>
      </div>

      {isCheckInOpen && (
        <div className={styles.modalOverlay} onClick={() => { setIsCheckInOpen(false); resetCheckIn(); }}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Check-in Patient</h3>
              <button className={styles.closeModalBtn} onClick={() => { setIsCheckInOpen(false); resetCheckIn(); }}>✕</button>
            </div>
            <form className={styles.modalBody} onSubmit={handleCheckIn}>
              <div className={styles.formSection}>
                <label className={styles.formLabel}>Contact Number</label>
                <div style={{ position: 'relative' }}>
                  <input type="text" className={styles.formInput} placeholder="10-digit mobile number"
                    value={ptPhone}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setPtPhone(val);
                      setShowDropdown(val.length >= 3);
                    }} required />
                  {ptPhone.length >= 3 && showDropdown && (
                    <div className={styles.searchDropdown}>
                      <div className={styles.searchItem}
                        style={{ background: 'rgba(23,3,55,0.02)', borderBottom: '1px solid rgba(23,3,55,0.06)' }}
                        onClick={() => { const ph = ptPhone; resetCheckIn(); setPtPhone(ph); setShowDropdown(false); }}>
                        <div style={{ fontWeight: 800, color: 'var(--sanctuary-primary)' }}>✨ Add as New Patient (+)</div>
                      </div>
                      {searchResults.map(p => (
                        <div key={p.id} className={styles.searchItem} onClick={() => handleSelectPatient(p)}>
                          <div><p style={{ fontWeight: 800, margin: 0 }}>{p.name}</p><p style={{ fontSize: 12, color: 'var(--sanctuary-ink-l)', margin: 0 }}>{p.age} yrs · {p.gender}</p></div>
                          <div className={styles.phoneBadge}>{p.contact}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className={styles.formSection}>
                <label className={styles.formLabel}>Full Name (Uppercase)</label>
                <input type="text" className={styles.formInput} value={ptName} onChange={e => setPtName(e.target.value.toUpperCase())} required />
              </div>
              <div className={styles.vitalsGrid}>
                <div className={styles.formSection}><label className={styles.formLabel}>Age</label><input type="number" className={styles.formInput} value={ptAge} onChange={e => setPtAge(e.target.value)} required /></div>
                <div className={styles.formSection}><label className={styles.formLabel}>Gender</label><select className={styles.formInput} value={ptSex} onChange={e => setPtSex(e.target.value)}><option>Male</option><option>Female</option><option>Other</option></select></div>
              </div>
              <div className={styles.vitalsGrid}>
                <div className={styles.formSection}><label className={styles.formLabel}>Weight (kg)</label><input type="number" step="0.1" className={styles.formInput} value={ptWeight} onChange={e => setPtWeight(e.target.value)} /></div>
                <div className={styles.formSection}><label className={styles.formLabel}>Blood Group</label><input type="text" className={styles.formInput} value={ptBloodGroup} onChange={e => setPtBloodGroup(e.target.value.toUpperCase())} placeholder="O+" /></div>
              </div>
              <div className={styles.formSection}><label className={styles.formLabel}>Home Address</label><textarea className={styles.formInput} style={{ height: 72 }} value={ptAddress} onChange={e => setPtAddress(e.target.value)} /></div>
              <div className={styles.formSection}>
                <label className={styles.formLabel}>Priority Level</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {(['normal', 'elderly', 'urgent'] as const).map(p => (
                    <button key={p} type="button" onClick={() => setCheckInPriority(p)}
                      style={{ flex: 1, border: `1.5px solid ${checkInPriority === p ? priorityConfig[p].color : 'rgba(23,3,55,0.1)'}`, background: checkInPriority === p ? priorityConfig[p].bg : '#fff', color: checkInPriority === p ? priorityConfig[p].color : 'var(--sanctuary-ink-l)', borderRadius: 10, padding: '8px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                      {priorityConfig[p].label}
                    </button>
                  ))}
                </div>
              </div>
              <button type="submit" className={styles.confirmBtn} disabled={isSubmitting}>
                {isSubmitting ? 'Adding...' : 'Confirm & Add to Queue'}
              </button>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
