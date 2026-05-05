'use client';

import { useEffect, useState, Suspense, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useClinic } from '@/context/ClinicContext';
import { getLocalTodayStr } from '@/lib/utils';
import DashboardLayout from '@/components/DashboardLayout';
import styles from './page.module.css';

interface Patient {
  id: string;
  name: string;
  contact?: string;
  age?: number;
  gender?: string;
  blood_group?: string;
  address?: string;
}

function PatientLobbyContent() {
  const router = useRouter();
  const { clinic, doctors } = useClinic();
  const [patientList, setPatientList] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  
  // Registration selection state
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [priority, setPriority] = useState<string>('normal');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const supabase = createClient();

  // Fetch patients
  const fetchPatients = useCallback(async () => {
    if (!clinic?.id) return;
    
    setIsSearching(true);
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('clinic_id', clinic.id)
      .or(`name.ilike.%${searchTerm}%,contact.ilike.%${searchTerm}%`)
      .order('name', { ascending: true })
      .limit(32);
        
    if (!error && data) {
      setPatientList(data);
    }
    setIsSearching(false);
  }, [searchTerm, clinic?.id, supabase]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(fetchPatients, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [fetchPatients]);

  // Handle Add to Queue
  const handleAddToQueue = (p: Patient) => {
    setSelectedPatient(p);
    setSelectedDoctorId(doctors?.[0]?.id || '');
    setPriority('normal');
    setIsCheckInModalOpen(true);
  };

  const confirmCheckIn = async () => {
    if (!selectedPatient || !clinic?.id) return;
    
    setIsSubmitting(true);
    try {
      // Get next token number
      const todayStr = getLocalTodayStr();
      const { data: maxTok } = await supabase
        .from('doctor_queue')
        .select('token_number')
        .eq('queue_date', todayStr)
        .eq('clinic_id', clinic.id)
        .order('token_number', { ascending: false })
        .limit(1);
      
      const nextToken = (maxTok?.[0]?.token_number ?? 0) + 1;

      const { error: qErr } = await supabase.from('doctor_queue').insert({
        clinic_id: clinic.id,
        doctor_id: selectedDoctorId || null,
        patient_id: selectedPatient.id,
        patient_name: selectedPatient.name,
        token_number: nextToken,
        status: 'waiting',
        priority: priority,
        queue_date: todayStr
      });

      if (qErr) throw qErr;
      
      setIsCheckInModalOpen(false);
      // Optional: show a success message or redirect to Live Queue
      router.push('/portal/front-desk');
    } catch (err: any) {
      alert(`Error adding to queue: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <DashboardLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <h1>Patient Lobby</h1>
            <p>Find registered patients and add them to today&apos;s waiting list.</p>
          </div>
          <button 
            className={styles.addToQueueBtn} 
            style={{ flex: 'none', padding: '12px 24px' }}
            onClick={() => router.push('/portal/front-desk/register-patient')}
          >
            Register New Patient
          </button>
        </div>

        <div className={styles.searchSection}>
          <div className={styles.searchWrapper}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={styles.searchIcon}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input 
              type="text" 
              className={styles.searchInput}
              placeholder="Search by Name, Phone, or ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className={styles.patientGrid}>
          {isSearching ? (
            <div className={styles.loading}>
               <p>Searching records...</p>
            </div>
          ) : patientList.length > 0 ? (
            patientList.map(p => (
              <div key={p.id} className={styles.patientCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.avatar}>{getInitials(p.name)}</div>
                </div>
                <h3 className={styles.patientName}>{p.name}</h3>
                <p className={styles.patientContact}>
                   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                   {p.contact || 'No Contact'}
                </p>
                <div className={styles.tagCloud}>
                  <span className={styles.tag}>{p.gender || 'General'}</span>
                  <span className={styles.tag}>{p.age ? `${p.age}Y` : 'Age N/A'}</span>
                  {p.blood_group && <span className={styles.tag} style={{background: '#fee2e2', color: '#dc2626'}}>{p.blood_group}</span>}
                </div>
                
                <div className={styles.actionArea}>
                  <button className={styles.addToQueueBtn} onClick={() => handleAddToQueue(p)}>
                    Add to Queue
                  </button>
                  <button className={styles.viewBtn} title="View Profile" onClick={() => router.push(`/portal/record-search?q=${p.contact || p.name}`)}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className={styles.emptyState}>
              <p>No patients found. Get started by registering a new patient.</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Check-In Modal */}
      {isCheckInModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsCheckInModalOpen(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Quick Check-in</h3>
              <button className={styles.closeBtn} onClick={() => setIsCheckInModalOpen(false)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            
            <div className={styles.modalBody}>
              <div style={{ marginBottom: 20 }}>
                <p style={{ margin: 0, fontWeight: 700, color: 'var(--sanctuary-primary)' }}>{selectedPatient?.name}</p>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--sanctuary-ink-l)' }}>{selectedPatient?.contact}</p>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Assign to Doctor</label>
                <select 
                  className={styles.selectInput}
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                >
                  <option value="">General Queue (No Doctor)</option>
                  {doctors?.map((d: any) => (
                    <option key={d.id} value={d.id}>{d.name} ({d.specialty || 'General'})</option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Priority Level</label>
                <div className={styles.priorityGrid}>
                  {['normal', 'urgent', 'elderly'].map(p => (
                    <button 
                      key={p}
                      className={`${styles.priorityBtn} ${priority === p ? styles.priorityBtnActive : ''}`}
                      onClick={() => setPriority(p)}
                    >
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.viewBtn} onClick={() => setIsCheckInModalOpen(false)}>Cancel</button>
              <button 
                className={styles.confirmBtn} 
                onClick={confirmCheckIn}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Processing...' : 'Confirm Check-in'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default function PatientLobby() {
  return (
    <Suspense fallback={<div className={styles.loading}>Loading Lobby...</div>}>
      <PatientLobbyContent />
    </Suspense>
  );
}
