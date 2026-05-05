'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useClinic } from '@/context/ClinicContext';
import DashboardLayout from '@/components/DashboardLayout';
import styles from './page.module.css';
import Link from 'next/link';

interface Visit {
  visit_date: string;
  notes: string | null;
  prescription: any;
}

interface Patient {
  id: string;
  name: string;
  contact?: string;
  age?: number;
  gender?: string;
  address?: string;
  blood_pressure?: string;
  created_at: string;
}

function PatientHistoryContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const patientId = searchParams?.get('patientId');
  const { clinic } = useClinic();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [summary, setSummary] = useState<string>('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [patientList, setPatientList] = useState<Patient[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const supabase = createClient();

  // 1. Fetch patients for grid (Search Mode)
  useEffect(() => {
    if (patientId || !clinic) return;
    
    const fetchPatients = async () => {
      setIsSearching(true);
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('clinic_id', clinic.id)
        .or(`name.ilike.%${searchTerm}%,contact.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false })
        .limit(20);
        
      if (!error && data) {
        setPatientList(data);
      }
      setIsSearching(false);
    };
    
    const delayDebounceFn = setTimeout(fetchPatients, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [patientId, searchTerm, supabase, clinic]);

  // 2. Fetch specific history (Detail Mode)
  useEffect(() => {
    if (!patientId || !clinic) return;
    
    const fetchHistory = async () => {
      // Fetch patient details (with clinic verify)
      const { data: pData } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .eq('clinic_id', clinic.id)
        .single();

      if (pData) setPatient(pData);

      // Fetch visits (prescriptions) (with clinic verify)
      const { data: vData } = await supabase
        .from('prescriptions')
        .select('*')
        .eq('patient_id', patientId)
        .eq('clinic_id', clinic.id)
        .order('created_at', { ascending: false });
      
      if (vData) {
        setVisits(vData.map(v => ({
          visit_date: v.created_at,
          notes: v.advice,
          prescription: v
        })));
        
        setSummary(vData[0]?.advice || 'No summary available.');
      }
    };
    fetchHistory();
  }, [patientId, supabase, clinic]);

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  // --- Search View Only ---
  return (
    <DashboardLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <h1>Patient Directory</h1>
            <p>Access patient hubs and complete clinical records.</p>
          </div>
          <div className={styles.headerActions}>
             <button className={styles.registerBtn} onClick={() => router.push('/portal/front-desk/register-patient')}>
               Register New Patient
             </button>
          </div>
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
                  <span className={`${styles.badge} ${styles.badgeStable}`}>ACTIVE</span>
                </div>
                <h3 className={styles.patientName}>{p.name}</h3>
                <p className={styles.patientContact}>
                   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                   {p.contact || 'No Contact'}
                </p>
                <div className={styles.tagCloud}>
                  <span className={styles.tag}>{p.gender || 'General'}</span>
                  <span className={styles.tag}>{p.age ? `${p.age}Y` : 'Age N/A'}</span>
                </div>
                 <button className={styles.viewBtn} onClick={() => router.push(`/portal/doctor-dashboard/patients/${p.id}`)}>
                  Patient Record
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                </button>
              </div>
            ))
          ) : (
            <div className={styles.emptyState}>
              <p>No patients found. Get started by registering a new patient.</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function PatientHistory() {
  return (
    <Suspense fallback={<div className={styles.loading}>Loading Data...</div>}>
      <PatientHistoryContent />
    </Suspense>
  );
}
