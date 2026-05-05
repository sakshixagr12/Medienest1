'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import styles from './page.module.css';
import Link from 'next/link';
import { API_BASE_URL, authenticatedFetch } from '@/lib/api';
import { useClinic } from '@/context/ClinicContext';

interface Patient {
  id: string;
  name: string;
  contact?: string;
  age?: number;
  gender?: string;
  has_diabetes?: boolean;
  has_hypertension?: boolean;
  has_thyroid?: boolean;
  past_surgeries?: string;
  allergies?: string;
  created_at: string;
}

interface Visit {
  visit_date: string;
  created_at?: string;
  doctor: string;
  complaints: string;
  findings: string;
  medicines: any[];
  advice: string;
  prescription_id: string;
}

interface Snapshot {
  keyConditions: string[];
  currentMedications: any[];
  recentVisitsSummary: string;
}

export default function PatientHub({ params }: { params: Promise<{ id: string }> }) {
  const { id: patientId } = use(params);
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [summaries, setSummaries] = useState<any[]>([]); // New state for Discharge Summaries
  const [admissions, setAdmissions] = useState<any[]>([]); // New state for Admission Records
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Patient Summary');
  const { clinic } = useClinic();

  const supabase = createClient();

  useEffect(() => {
    if (!clinic?.id || !patientId) return;

    const fetchPatientData = async () => {
      try {
        const response = await authenticatedFetch(`${API_BASE_URL}/api/patient-history/${patientId}?clinic_id=${clinic.id}`);
        const data = await response.json();

        if (data.patient) setPatient(data.patient);
        if (data.visits) setVisits(data.visits);
        if (data.summaries) setSummaries(data.summaries); // Capture summaries
        if (data.admissions) setAdmissions(data.admissions); // Capture admissions
        if (data.summary) setSnapshot(data.summary);
      } catch (err) {
        console.error('Error fetching patient hub data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPatientData();
  }, [patientId, clinic?.id]);

  if (loading) return <div className={styles.loading}>Initializing Clinical Hub...</div>;

  const navItems = [
    { label: 'Patient Summary', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> },
    { label: 'Clinical History', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> },
    { label: 'Medications', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.5 20.5a7 7 0 1 1 9.9-9.9l-6.3 6.3a3.5 3.5 0 1 1-4.9-4.9l5.1-5.1"></path></svg> },
    { label: 'Admissions', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 14h18M5 14v4M19 14v4M3 8h18M6 8V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3M12 4v4"></path></svg> },
    { label: 'Discharge Summaries', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg> },
    { label: 'Lab Results', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 2v8l-8 12h20l-8-12V2"></path><line x1="6" y1="12" x2="18" y2="12"></line></svg> },
    { label: 'Encounters', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg> },
  ];

  // Helper: Aggregate all medications from both OPD and IPD
  const allMeds = [
    ...(visits || []).reduce((acc: any[], v) => {
      const medsWithDate = (v.medicines || []).map(m => ({ ...m, date: v.visit_date, doctor: v.doctor, type: 'OPD' }));
      return [...acc, ...medsWithDate];
    }, []),
    ...(summaries || []).reduce((acc: any[], s) => {
      // Robust Medicines Parsing with fallback for malformed JSON
      let parsedMeds = [];
      try {
        const rawMeds = s.medicines;
        parsedMeds = Array.isArray(rawMeds) ? rawMeds : (typeof rawMeds === 'string' ? JSON.parse(rawMeds) : []);
      } catch (e) {
        console.warn(`⚠️ [HUB-SYNC] Failed to parse medicines for Summary: ${s.id}`);
      }
      
      const medsWithDate = (parsedMeds || []).map((m: any) => ({ 
        ...m, 
        dose: m.dose || m.frequency || '---', 
        dur: m.dur || m.duration || '---', 
        date: s.date_discharge || s.created_at, 
        doctor: s.doctor_name,
        type: 'IPD'
      }));
      return [...acc, ...medsWithDate];
    }, [])
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const renderSummary = () => (
    <>
       <section className={styles.snapshotCard}>
          <div className={styles.snapGroup}>
             <h4>Bio-Metrics</h4>
             <div className={styles.snapValue}>{patient?.name}</div>
             <div style={{ marginTop: 8, opacity: 0.8 }}>{patient?.age} / {patient?.gender}</div>
             <div style={{ marginTop: 12, fontSize: 18, fontWeight: 700 }}>{patient?.contact}</div>
             {patient?.allergies && (
                <div style={{ marginTop: 16, padding: '8px 12px', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 8, color: '#b91c1c', fontSize: 12, fontWeight: 800 }}>
                   ⚠️ ALLERGIC: {patient.allergies}
                </div>
              )}
          </div>

          <div className={styles.snapGroup}>
             <h4>⚠️ Key Conditions</h4>
             <ul className={styles.conditionList}>
                {snapshot?.keyConditions ? snapshot.keyConditions.map((c, i) => (
                  <li key={i}>{c}</li>
                )) : <li>{loading ? 'Calculated...' : 'No conditions found'}</li>}
             </ul>
             <h4 style={{ marginTop: 24 }}>💊 Current Medications</h4>
             <ul className={styles.conditionList}>
                {snapshot?.currentMedications ? snapshot.currentMedications.map((m, i) => (
                  <li key={i}>{typeof m === 'object' ? m.name : m}</li>
                )) : <li>{loading ? 'Analyzing Rx...' : 'None listed'}</li>}
             </ul>
          </div>

          <div className={styles.snapGroup}>
             <div className={styles.visitSummary}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                   <span style={{ fontWeight: 800, fontSize: 13 }}>RECENT VISITS</span>
                </div>
                <p className={styles.summaryText}>{snapshot?.recentVisitsSummary}</p>
                <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)', color: '#f59e0b', fontSize: 13, fontWeight: 800 }}>
                   IMPORTANT: Revisit for follow-up as advised.
                </div>
             </div>
          </div>
       </section>
       
       <div className={styles.sectionBox}>
          <h3>Quick Profile</h3>
          <div className={styles.profileGrid}>
             <div className={styles.profileItem}><strong>Contact:</strong> {patient?.contact}</div>
             <div className={styles.profileItem}><strong>Age:</strong> {patient?.age} Years</div>
             <div className={styles.profileItem}><strong>Gender:</strong> {patient?.gender}</div>
             <div className={styles.profileItem}><strong>Joined:</strong> {new Date(patient?.created_at || '').toLocaleDateString()}</div>
          </div>
       </div>

       {(patient?.has_diabetes || patient?.has_hypertension || patient?.has_thyroid || patient?.past_surgeries) && (
          <div className={styles.sectionBox}>
             <h3>Medical Background</h3>
             <div className={styles.profileGrid}>
                <div className={styles.profileItem}><strong>Comorbidities:</strong> {[
                  patient.has_diabetes && "Diabetes",
                  patient.has_hypertension && "Hypertension",
                  patient.has_thyroid && "Thyroid"
                ].filter(Boolean).join(', ') || 'None'}</div>
                <div className={styles.profileItem} style={{ gridColumn: 'span 2' }}>
                  <strong>Past Surgeries:</strong> {patient.past_surgeries || 'None recorded'}
                </div>
             </div>
          </div>
        )}

       {admissions.length > 0 && (
         <div className={styles.sectionBox} style={{ borderLeft: '4px solid #f59e0b', background: '#fffbeb' }}>
            <h3 style={{ color: '#b45309', display: 'flex', alignItems: 'center', gap: 8 }}>
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 14h18M5 14v4M19 14v4M3 8h18M6 8V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3M12 4v4"></path></svg>
               Current/Latest Admission Details
            </h3>
            <div className={styles.profileGrid}>
               <div className={styles.profileItem}><strong>Admission ID:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 900 }}>{admissions[0].id.slice(0, 8).toUpperCase()}</span></div>
               <div className={styles.profileItem}><strong>Adm. Date:</strong> {new Date(admissions[0].date_admission).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
               <div className={styles.profileItem}><strong>Department:</strong> {admissions[0].department || 'General Medicine'}</div>
               <div className={styles.profileItem}><strong>Ward No:</strong> {admissions[0].ward || '---'}</div>
               <div className={styles.profileItem}><strong>Bed No:</strong> {admissions[0].bed || '---'}</div>
               <div className={styles.profileItem}><strong>Admitting Dr:</strong> Dr. {admissions[0].doctor_name}</div>
               <div className={styles.profileItem}><strong>Adm. Type:</strong> {admissions[0].admission_type || 'OPD'}</div>
               <div className={styles.profileItem}>
                  <strong>Triage:</strong> 
                  <span style={{ 
                     marginLeft: 8, 
                     padding: '2px 8px', 
                     borderRadius: 4, 
                     fontSize: 10, 
                     fontWeight: 900, 
                     textTransform: 'uppercase',
                     background: admissions[0].severity === 'Severe' ? '#ef4444' : admissions[0].severity === 'Moderate' ? '#f59e0b' : '#10b981',
                     color: '#fff'
                  }}>
                     {admissions[0].severity || 'Mild'}
                  </span>
               </div>
                {(admissions[0].vitals_pulse || admissions[0].vitals_bp_sys) && (
                   <div className={styles.profileItem} style={{ gridColumn: 'span 2', marginTop: 8, padding: '12px 16px', background: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca', color: '#991b1b' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                            <strong style={{ fontSize: 13 }}>❤️ VITALS:</strong>
                            <div style={{ display: 'flex', gap: 12, fontSize: 13, fontWeight: 700 }}>
                               {admissions[0].vitals_bp_sys && <span>BP: {admissions[0].vitals_bp_sys}/{admissions[0].vitals_bp_dia} mmHg</span>}
                               {admissions[0].vitals_pulse && <span>Pulse: {admissions[0].vitals_pulse} bpm</span>}
                               {admissions[0].vitals_temp && <span>Temp: {admissions[0].vitals_temp}°F</span>}
                               {admissions[0].vitals_spo2 && <span>SpO₂: {admissions[0].vitals_spo2}%</span>}
                            </div>
                         </div>
                         <div style={{ display: 'flex', gap: 8 }}>
                            {admissions[0].allergies && <span style={{ background: '#ef4444', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 900 }}>🔴 ALLERGIES</span>}
                            {admissions[0].vitals_temp > 101 && <span style={{ background: '#f59e0b', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 900 }}>⚠️ FEVER</span>}
                            {admissions[0].vitals_spo2 < 94 && <span style={{ background: '#dc2626', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 900 }}>🚨 LOW SPO2</span>}
                         </div>
                      </div>
                   </div>
                )}
            </div>
            {admissions[0].attachments && admissions[0].attachments.length > 0 && (
               <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, fontSize: 13, fontWeight: 900, color: 'var(--sanctuary-primary)' }}>
                     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                     ATTACHED REPORTS ({admissions[0].attachments.length})
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                     {admissions[0].attachments.map((file: any, idx: number) => (
                        <a 
                           key={idx} 
                           href={file.url} 
                           target="_blank" 
                           rel="noopener noreferrer"
                           style={{ 
                              padding: '6px 12px', 
                              background: '#fff', 
                              border: '1px solid #e2e8f0', 
                              borderRadius: 8, 
                              fontSize: 11, 
                              fontWeight: 700, 
                              color: 'var(--sanctuary-primary)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6
                           }}
                        >
                           <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                           {file.name.length > 20 ? file.name.slice(0, 17) + '...' : file.name}
                        </a>
                     ))}
                  </div>
               </div>
            )}
          </div>
        )}
     </>
  );

  const renderHistory = () => (
    <>
       <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input type="text" placeholder="Search clinical notes..." style={{ flex: 1, padding: '12px 16px', borderRadius: 12, border: '1px solid #e2e8f0', outline: 'none', background: '#fff' }} />
       </div>

       <section className={styles.timelineSection}>
          {visits.map((visit, index) => (
            <div key={visit.prescription_id} className={styles.timelineItem}>
               <div className={styles.timelineMarker} />
               <div className={styles.timelineCard}>
                  <div className={styles.timelineHeader}>
                     <div className={styles.visitMeta}>
                        <h3>Consultation - {visit.doctor}</h3>
                        <p>{new Date(visit.visit_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} • {new Date(visit.created_at || visit.visit_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                     </div>
                     <span className={`${styles.badge} ${styles.badgeFollowUp}`}>COMPLETED Visit</span>
                  </div>

                  <div className={styles.visitDetails}>
                     <div className={styles.detailBlock}>
                        <h5>Chief Complaints</h5>
                        <div className={styles.complaintList}>
                           <p style={{ fontSize: 15, lineHeight: 1.6, color: '#334155' }}>• {visit.complaints}</p>
                           {visit.findings && <p style={{ fontSize: 15, lineHeight: 1.6, color: '#334155' }}>• {visit.findings}</p>}
                        </div>

                        <h5>Prescribed Medications</h5>
                        <div className={styles.medList}>
                           {visit.medicines.map((m, mi) => (
                             <div key={mi} className={styles.medCardSmall}>
                                <div className={styles.medIcon}>💊</div>
                                <div className={styles.medInfo}>
                                   <h6>{m.name}</h6>
                                   <p>{m.dose} • {m.freq} • {m.dur}</p>
                                </div>
                             </div>
                           ))}
                        </div>
                     </div>

                     <div className={styles.detailBlock}>
                        <h5>Doctor's Advice</h5>
                        <div className={styles.doctorNote}>
                           <p style={{ fontStyle: 'italic', color: '#475569', lineHeight: 1.7 }}>
                             "{visit.advice}"
                           </p>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          ))}
          {visits.length === 0 && (
            <div className={styles.emptyState}>No visits found.</div>
          )}
       </section>
    </>
  );

  const renderMedications = () => (
    <div className={styles.sectionBox}>
       <h3>All Historical Medications</h3>
       <table className={styles.hubTable}>
          <thead>
             <tr>
                <th>Medicine</th>
                <th>Dosage</th>
                <th>Frequency</th>
                <th>Duration</th>
                <th>Type</th>
                <th>Prescribed On</th>
                <th>Doctor</th>
             </tr>
          </thead>
          <tbody>
             {allMeds.map((m, i) => (
               <tr key={i}>
                  <td><strong>{m.name}</strong></td>
                  <td>{m.dose}</td>
                  <td>{m.freq || m.frequency}</td>
                  <td>{m.dur}</td>
                  <td>
                    <span style={{ 
                      padding: '2px 8px', 
                      borderRadius: 6, 
                      fontSize: 10, 
                      fontWeight: 900, 
                      background: m.type === 'IPD' ? '#fef3c7' : '#e0f2fe',
                      color: m.type === 'IPD' ? '#92400e' : '#0369a1' 
                    }}>
                      {m.type}
                    </span>
                  </td>
                  <td>{new Date(m.date).toLocaleDateString()}</td>
                  <td>{m.doctor}</td>
               </tr>
             ))}
             {allMeds.length === 0 && (
               <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}>No medications found.</td></tr>
             )}
          </tbody>
       </table>
    </div>
  );

  const renderLabs = () => (
    <div className={styles.emptyHubState}>
       <div className={styles.emptyIcon}>🧪</div>
       <h2>No Lab Results Yet</h2>
       <p>Laboratory integrations and reports for {patient?.name} will appear here.</p>
       <button className={styles.btnSecondary} style={{ marginTop: 24 }}>Upload Report</button>
    </div>
  );

  const renderDischargeSummaries = () => (
    <div className={styles.sectionBox}>
       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3>IPD Discharge Summaries</h3>
       </div>
       <table className={styles.hubTable}>
          <thead>
             <tr>
                <th>Date</th>
                <th>Diagnosis</th>
                <th>Doctor</th>
                <th>Reg No.</th>
                <th>Action</th>
             </tr>
          </thead>
          <tbody>
             {summaries.map((s, i) => (
               <tr key={i}>
                  <td><strong>{new Date(s.created_at).toLocaleDateString()}</strong></td>
                  <td>{s.diagnosis}</td>
                  <td>Dr. {s.doctor_name}</td>
                  <td>{s.reg_no || '---'}</td>
                  <td>
                     <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Link href={`/portal/discharge-summary/view?id=${s.id}`} className={styles.tableAction}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 6 }}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                          View
                        </Link>
                        <span style={{ fontSize: 10, padding: '2px 6px', background: '#ecfdf5', color: '#065f46', borderRadius: 4, fontWeight: 900 }}>
                          📝 RECORD ATTACHED
                        </span>
                     </div>
                  </td>
               </tr>
             ))}
             {summaries.length === 0 && (
               <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40 }}>No discharge summaries found.</td></tr>
             )}
          </tbody>
       </table>
    </div>
  );

  const renderAdmissions = () => (
    <div className={styles.sectionBox}>
       <h3>Admission Records</h3>
       <table className={styles.hubTable}>
          <thead>
             <tr>
                <th>Date of Admission</th>
                <th>Bed / Ward</th>
                <th>Diagnosis</th>
                <th>Clinician</th>
                <th>Status</th>
                <th>Actions</th>
             </tr>
          </thead>
          <tbody>
             {admissions.map((a, i) => (
                <tr key={i}>
                   <td>{new Date(a.date_admission).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                   <td>{a.ward || '---'} / {a.bed || '---'}</td>
                   <td>{a.diagnosis || '---'}</td>
                   <td>Dr. {a.doctor_name}</td>
                   <td><span className={styles.badge} style={{ background: '#ecfdf5', color: '#065f46' }}>ADMITTED</span></td>
                   <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                         <Link href={`/portal/admission-record/view?id=${a.id}`} className={styles.tableAction}>
                           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 6 }}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                           View
                         </Link>
                      </div>
                   </td>
                </tr>
             ))}
             {admissions.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40 }}>No admission records found.</td></tr>
             )}
          </tbody>
       </table>
    </div>
  );

  const renderEncounters = () => (
    <div className={styles.sectionBox}>
       <h3>Clinical Encounters</h3>
       <table className={styles.hubTable}>
          <thead>
             <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Specialty</th>
                <th>Practitioner</th>
                <th>Status</th>
                <th>Actions</th>
             </tr>
          </thead>
          <tbody>
             {visits.map((v, i) => (
               <tr key={i}>
                  <td>{new Date(v.visit_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td>{new Date(v.created_at || v.visit_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                  <td>General Practice</td>
                  <td>{v.doctor}</td>
                  <td><span className={styles.badge} style={{ background: '#e0f2fe', color: '#0369a1' }}>COMPLETED</span></td>
                  <td>
                     <button className={styles.tableAction} onClick={() => { setActiveTab('Clinical History'); }}>View Record</button>
                  </td>
               </tr>
             ))}
             {visits.length === 0 && (
               <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40 }}>No encounters found.</td></tr>
             )}
          </tbody>
       </table>
    </div>
  );

  return (
    <DashboardLayout>
      <div className={styles.container}>
        {/* Hub Sidebar */}
        <aside className={styles.sidebar}>
          <div className={styles.profileCard}>
            <div className={styles.profileAvatar}>
               <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--sanctuary-lavender)', color: 'var(--sanctuary-primary)', fontSize: 32, fontWeight: 900 }}>
                 {patient?.name?.[0]}
               </div>
            </div>
            <h3 className={styles.profileName}>{patient?.name}</h3>
            <p className={styles.profileId}>ID: {patientId.slice(0, 8).toUpperCase()}</p>
          </div>

          <nav className={styles.nav}>
            {navItems.map(item => (
              <button 
                key={item.label} 
                className={`${styles.navLink} ${activeTab === item.label ? styles.activeNavLink : ''}`}
                onClick={() => setActiveTab(item.label)}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Hub Content area */}
        <main className={styles.content}>
           <div className={styles.hubHeader}>
              <h2 className={styles.patientTitle}>{activeTab}</h2>
              <div className={styles.actionGroup}>
                 <button className={`${styles.actionBtn} ${styles.btnPrimary}`} onClick={() => router.push(`/portal/digital-prescription?patientId=${patientId}`)}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    New Visit
                 </button>
                 <button className={`${styles.actionBtn} ${styles.btnSecondary}`}>Export History</button>
              </div>
           </div>

           {activeTab === 'Patient Summary' && renderSummary()}
           {activeTab === 'Clinical History' && renderHistory()}
           {activeTab === 'Medications' && renderMedications()}
           {activeTab === 'Admissions' && renderAdmissions()}
           {activeTab === 'Discharge Summaries' && renderDischargeSummaries()}
           {activeTab === 'Lab Results' && renderLabs()}
           {activeTab === 'Encounters' && renderEncounters()}
        </main>
      </div>
    </DashboardLayout>
  );
}
