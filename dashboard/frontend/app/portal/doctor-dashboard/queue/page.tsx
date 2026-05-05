'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useClinic } from '@/context/ClinicContext';
import { API_BASE_URL, authenticatedFetch } from '@/lib/api';
import DashboardLayout from '@/components/DashboardLayout';
import { displayDoctorName } from '@/lib/utils';
import Link from 'next/link';
import styles from './page.module.css';

// ── Types ────────────────────────────────────────────────────────────────
interface QueueEntry {
  id: string;
  patient_id: string;
  patient_name: string;
  token_number: number;
  status: 'waiting' | 'serving' | 'done' | 'skipped';
  priority: 'normal' | 'urgent' | 'elderly';
  check_in_time: string;
  serving_started_at: string | null;
  completed_at: string | null;
  notes: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────
const API = API_BASE_URL;

const priorityConfig = {
  urgent:  { label: '🔴 Urgent',  color: '#ef4444', bg: '#fff1f2' },
  elderly: { label: '🟡 Elderly', color: '#f59e0b', bg: '#fffbeb' },
  normal:  { label: '⚪ Normal',  color: '#94a3b8', bg: '#f8fafc' },
};

function useElapsed(startedAt: string | null) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (!startedAt) { setSecs(0); return; }
    const base = new Date(startedAt).getTime();
    const tick = () => setSecs(Math.floor((Date.now() - base) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s.toString().padStart(2, '0')}s`;
  return `${s}s`;
}

// ── Clock badge component ─────────────────────────────────────────────────
function ConsultTimer({ startedAt }: { startedAt: string | null }) {
  const elapsed = useElapsed(startedAt);
  if (!startedAt) return null;
  return (
    <span className={styles.timerBadge}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
      {elapsed}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────
export default function DoctorQueuePage() {
  const searchParams = useSearchParams();
  const doctorIdParam = searchParams?.get('doctorId');
  const { clinic, doctors } = useClinic();
  const [queue, setQueue]         = useState<QueueEntry[]>([]);
  const [doneCount, setDoneCount] = useState(0);
  const [loading, setLoading]     = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError]         = useState<string | null>(null);

  const activeDoctorId = doctorIdParam || (doctors?.[0]?.id ?? null);
  const activeDoctorName = doctors?.find(d => d.id === activeDoctorId)?.name ?? doctors?.[0]?.name ?? 'Doctor';

  // Stable Supabase client — never recreated between renders
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  // ── Fetch queue ──────────────────────────────────────────────────────
  const fetchQueue = useCallback(async () => {
    if (!clinic?.id) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ clinic_id: clinic.id });
      if (activeDoctorId) params.set('doctor_id', activeDoctorId);
      const res = await authenticatedFetch(`${API}/api/queue?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setQueue(json.queue);
      setDoneCount(json.doneCount);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [clinic, activeDoctorId]);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  // ── Supabase Realtime subscription ────────────────────────────────────
  useEffect(() => {
    if (!clinic?.id) return;
    const channel = supabase
      .channel(`doctor-queue-live-${clinic.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'doctor_queue', filter: `clinic_id=eq.${clinic.id}` },
        () => { fetchQueue(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [clinic?.id, fetchQueue]);

  // ── Queue Actions ─────────────────────────────────────────────────────
  const updateStatus = async (id: string, status: string) => {
    setActionLoading(id + status);
    try {
      await authenticatedFetch(`${API}/api/queue/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      fetchQueue();
    } finally {
      setActionLoading(null);
    }
  };

  const callNext = async () => {
    setActionLoading('call-next');
    try {
      await authenticatedFetch(`${API}/api/queue/call-next`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinic_id: clinic?.id, doctor_id: activeDoctorId }),
      });
      fetchQueue();
    } finally {
      setActionLoading(null);
    }
  };

  // ── Derived state ─────────────────────────────────────────────────────
  const serving  = queue.find(q => q.status === 'serving') ?? null;
  const waiting  = queue.filter(q => q.status === 'waiting');
  const nextThree = waiting.slice(0, 3);
  const remaining = waiting.slice(3);

  const totalInQueue   = queue.length;
  const avgConsultMins = 10;
  const estimateWait   = (idx: number) => `~${(idx + 1) * avgConsultMins} min`;

  return (
    <DashboardLayout>
      <div className={styles.page}>

        {/* ── Page Header ─────────────────────────────────────────────── */}
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Live Queue</h1>
            <p className={styles.pageSubtitle}>
              {displayDoctorName(activeDoctorName)} · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <div className={styles.headerActions}>
            <div className={styles.statPills}>
              <span className={styles.statPill}>
                <span className={styles.statNum}>{totalInQueue}</span> In Queue
              </span>
              <span className={`${styles.statPill} ${styles.statPillGreen}`}>
                <span className={styles.statNum}>{doneCount}</span> Done Today
              </span>
            </div>
            <button
              className={`${styles.callNextBtn} ${actionLoading === 'call-next' ? styles.loading : ''}`}
              onClick={callNext}
              disabled={!!actionLoading || waiting.length === 0}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              Call Next Patient
            </button>
          </div>
        </div>

        {error && (
          <div className={styles.errorBanner}>
            ⚠️ {error} — <button onClick={fetchQueue}>Retry</button>
          </div>
        )}

        {loading ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner}/>
            <p>Loading live queue…</p>
          </div>
        ) : (
          <div className={styles.queueLayout}>

            {/* ── Left Column: Active Queue ──────────────────────────── */}
            <div className={styles.mainCol}>

              {/* 🔴 Now Serving */}
              <section className={styles.tierSection}>
                <div className={styles.tierHeader}>
                  <span className={styles.dot} style={{ background: '#ef4444' }}/>
                  <span className={styles.tierLabel}>Now Serving</span>
                  {serving && <ConsultTimer startedAt={serving.check_in_time} />}
                </div>

                {serving ? (
                  <div className={styles.nowServingCard}>
                    <div className={styles.nsLeft}>
                      <div className={styles.nsAvatar}>
                        {serving.patient_name?.[0] ?? '?'}
                      </div>
                      <div className={styles.nsInfo}>
                        <p className={styles.nsName}>{serving.patient_name}</p>
                        <p className={styles.nsMeta}>
                          Token #{serving.token_number} &nbsp;·&nbsp;
                          <span className={styles.priorityTag} style={{ color: priorityConfig[serving.priority].color }}>
                            {priorityConfig[serving.priority].label}
                          </span>
                        </p>
                        {serving.notes && <p className={styles.nsNote}>📝 {serving.notes}</p>}
                      </div>
                    </div>
                    <div className={styles.nsActions}>
                      <Link
                        href={`/portal/doctor-dashboard/patients/${serving.patient_id}`}
                        className={styles.btnOutline}
                      >
                        View Record
                      </Link>
                      <Link
                        href={`/portal/digital-prescription?patientId=${serving.patient_id}&doctorName=${encodeURIComponent(activeDoctorName)}`}
                        className={styles.btnPrimary}
                      >
                        ✍️ Prescribe
                      </Link>
                      <button
                        className={styles.btnDone}
                        onClick={() => updateStatus(serving.id, 'done')}
                        disabled={actionLoading === serving.id + 'done'}
                      >
                        ✅ Mark Done
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={styles.emptyCard}>
                    <p>No patient is currently being served.</p>
                    {waiting.length > 0 && (
                      <button className={styles.callNextBtn} onClick={callNext} style={{ marginTop: 16 }}>
                        Call First Patient
                      </button>
                    )}
                  </div>
                )}
              </section>

              {/* 🟡 Waiting — Next 3 */}
              <section className={styles.tierSection}>
                <div className={styles.tierHeader}>
                  <span className={styles.dot} style={{ background: '#f59e0b' }}/>
                  <span className={styles.tierLabel}>
                    Waiting — Next {Math.min(3, nextThree.length)}
                  </span>
                  <span className={styles.tierCount}>{waiting.length} total</span>
                </div>

                {nextThree.length === 0 ? (
                  <div className={styles.emptyCard}><p>No patients waiting.</p></div>
                ) : (
                  <div className={styles.waitList}>
                    {nextThree.map((entry, idx) => (
                      <div key={entry.id} className={styles.waitCard}>
                        <div className={styles.waitLeft}>
                          <div className={styles.tokenBadge} style={{ background: priorityConfig[entry.priority].color }}>
                            #{entry.token_number}
                          </div>
                          <div className={styles.waitInfo}>
                            <p className={styles.waitName}>{entry.patient_name}</p>
                            <p className={styles.waitMeta}>
                              <span className={styles.priorityTag} style={{ color: priorityConfig[entry.priority].color }}>
                                {priorityConfig[entry.priority].label}
                              </span>
                              &nbsp;·&nbsp;Wait {estimateWait(idx)}
                            </p>
                            {entry.notes && <p className={styles.nsNote}>📝 {entry.notes}</p>}
                          </div>
                        </div>
                        <div className={styles.waitActions}>
                          <button
                            className={styles.btnSmallOutline}
                            onClick={() => updateStatus(entry.id, 'skipped')}
                            disabled={!!actionLoading}
                            title="Skip patient"
                          >
                            Skip
                          </button>
                          <button
                            className={styles.btnSmallPrimary}
                            onClick={() => updateStatus(entry.id, 'serving')}
                            disabled={!!actionLoading || !!serving}
                            title="Call this patient now"
                          >
                            Call
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* ⚪ Remaining Queue */}
              {remaining.length > 0 && (
                <section className={styles.tierSection}>
                  <div className={styles.tierHeader}>
                    <span className={styles.dot} style={{ background: '#94a3b8' }}/>
                    <span className={styles.tierLabel}>Remaining Queue</span>
                    <span className={styles.tierCount}>{remaining.length} patients</span>
                  </div>
                  <div className={styles.remainingList}>
                    {remaining.map((entry) => (
                      <div key={entry.id} className={styles.remainingRow}>
                        <span className={styles.remainingToken}>#{entry.token_number}</span>
                        <span className={styles.remainingName}>{entry.patient_name}</span>
                        <span className={styles.remainingPriority} style={{ color: priorityConfig[entry.priority].color }}>
                          {priorityConfig[entry.priority].label}
                        </span>
                        <span className={styles.remainingTime}>
                          {new Date(entry.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <button
                          className={styles.removeBtn}
                          onClick={() => updateStatus(entry.id, 'skipped')}
                          title="Skip"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {queue.length === 0 && !loading && (
                <div className={styles.emptyQueue}>
                  <div className={styles.emptyIcon}>🏥</div>
                  <h3>Queue is Empty</h3>
                  <p>No patients have been added to the queue today. The front desk can add patients from the Queue Manager.</p>
                  <Link href="/portal/front-desk/queue-manager" className={styles.btnPrimary} style={{ marginTop: 16 }}>
                    Open Queue Manager
                  </Link>
                </div>
              )}
            </div>

            {/* ── Right Column: Stats sidebar ────────────────────────── */}
            <aside className={styles.sideCol}>
              {/* Today Stats */}
              <div className={styles.statsCard}>
                <h4 className={styles.statsTitle}>Today's Stats</h4>
                <div className={styles.statRow}>
                  <span className={styles.statRowLabel}>Seen</span>
                  <span className={styles.statRowVal}>{doneCount}</span>
                </div>
                <div className={styles.statRow}>
                  <span className={styles.statRowLabel}>Waiting</span>
                  <span className={styles.statRowVal}>{waiting.length}</span>
                </div>
                <div className={styles.statRow}>
                  <span className={styles.statRowLabel}>Serving</span>
                  <span className={styles.statRowVal}>{serving ? 1 : 0}</span>
                </div>
                <div className={`${styles.statRow} ${styles.statRowBorder}`}>
                  <span className={styles.statRowLabel}>Avg Wait</span>
                  <span className={styles.statRowVal}>~{avgConsultMins} min</span>
                </div>
                {/* Priority breakdown */}
                <div className={styles.priorityBreakdown}>
                  {(['urgent', 'elderly', 'normal'] as const).map(p => {
                    const cnt = waiting.filter(e => e.priority === p).length;
                    return (
                      <div key={p} className={styles.pBreakRow}>
                        <span style={{ color: priorityConfig[p].color }}>{priorityConfig[p].label}</span>
                        <span className={styles.pBreakCount}>{cnt}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Links */}
              <div className={styles.quickLinksCard}>
                <h4 className={styles.statsTitle}>Quick Actions</h4>
                <Link href={`/portal/digital-prescription?doctorName=${encodeURIComponent(activeDoctorName)}`} className={styles.qlLink}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  New Prescription
                </Link>
                <Link href="/portal/doctor-dashboard/patients" className={styles.qlLink}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                  Patient Directory
                </Link>
                <Link href="/portal/front-desk/queue-manager" className={styles.qlLink}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
                    <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
                    <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                  </svg>
                  Queue Manager
                </Link>
              </div>
            </aside>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
