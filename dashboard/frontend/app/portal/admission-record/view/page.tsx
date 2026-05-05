'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useClinic } from '@/context/ClinicContext';
import styles from './view.module.css';

export default function AdmissionRecordView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams?.get('id');
  const { clinic, loading: clinicLoading } = useClinic();
  const supabase = createClient();
  
  const [record, setRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecord() {
      if (!id || !clinic?.id) return setLoading(false);
      const { data, error } = await supabase
        .from('admission_records')
        .select('*')
        .eq('id', id)
        .eq('clinic_id', clinic.id)
        .single();
        
      if (!error && data) {
        setRecord(data);
      }
      setLoading(false);
    }
    fetchRecord();
  }, [id, clinic?.id]);

  if (clinicLoading || loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading Admission Record...</div>;
  if (!record) return <div style={{ padding: 40, textAlign: 'center' }}>Record not found or access denied.</div>;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className={styles.btnBack} onClick={() => router.back()}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            Back to Patient Record
          </button>
          <div style={{ color: 'var(--sanctuary-ink-l)', fontSize: 13, fontWeight: 600 }}>Archived Record</div>
        </div>
        <button className={styles.btnPrint} onClick={() => window.print()}>🖨️ Print</button>
      </header>

      <main className={styles.viewport}>
        <div className={styles.previewDoc}>
          <table className={styles.printableTable}>
             <thead>
               <tr>
                 <td>
                   <div className={styles.previewHeader}>
                     <h2>{clinic?.name || 'Clinic'}</h2>
                     <p>{clinic?.address || ''}</p>
                     <div style={{ marginTop: 12, fontSize: 15, fontWeight: 900, textDecoration: 'underline' }}>ADMISSION RECORD</div>
                   </div>
                   <div className={styles.previewInfoGrid}>
                     <div><b>Patient Name:</b> {record.patient_name}</div>
                     <div><b>Admission ID:</b> {record.id.slice(0, 8).toUpperCase()}</div>
                     <div><b>Age / Sex:</b> {record.age_sex}</div>
                     <div><b>Contact:</b> {record.contact || '---'}</div>
                     <div><b>Department:</b> {record.department || '---'}</div>
                     <div><b>Ward / Bed:</b> {record.ward || '---'} / {record.bed || '---'}</div>
                     <div><b>Consultant:</b> Dr. {record.doctor_name || '---'}</div>
                     <div><b>Admission Date:</b> {new Date(record.date_admission).toLocaleString()}</div>
                     <div><b>Admission Source:</b> {record.admission_type || 'OPD'}</div>
                     <div style={{ marginTop: 4 }}>
                        <b>Triage Level:</b> 
                        <span style={{ 
                           marginLeft: 8, 
                           padding: '2px 10px', 
                           borderRadius: 4, 
                           fontSize: 11, 
                           fontWeight: 900, 
                           textTransform: 'uppercase',
                           background: record.severity === 'Severe' ? '#ef4444' : record.severity === 'Moderate' ? '#f59e0b' : '#10b981',
                           color: '#fff'
                        }}>
                           {record.severity || 'Mild'}
                        </span>
                     </div>
                     <div style={{ gridColumn: 'span 2', marginTop: 8, padding: '8px 12px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                        <b>Comorbidities:</b> {[
                          record.has_diabetes && "Diabetes",
                          record.has_hypertension && "Hypertension",
                          record.has_thyroid && "Thyroid"
                        ].filter(Boolean).join(', ') || 'None'}
                     </div>
                   </div>
                  </td>
                </tr>
                {/* --- Critical Alerts (Print Only) --- */}
                {(record.allergies || record.vitals_temp > 101 || record.vitals_spo2 < 94) && (
                  <tr>
                    <td colSpan={2} style={{ padding: '0 40px' }}>
                       <div style={{ background: '#fef2f2', border: '2px solid #ef4444', borderRadius: 8, padding: '12px 20px', marginBottom: 20 }}>
                          <h4 style={{ margin: '0 0 8px 0', color: '#b91c1c', fontSize: 13, textTransform: 'uppercase', fontWeight: 900 }}>⚠️ Critical Clinical Alerts</h4>
                          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                             {record.allergies && <div style={{ fontSize: 13, color: '#ef4444' }}><b>🔴 ALLERGIES:</b> {record.allergies}</div>}
                             {record.vitals_temp > 101 && <div style={{ fontSize: 13, color: '#b45309' }}><b>🔥 HIGH FEVER:</b> {record.vitals_temp}°F</div>}
                             {record.vitals_spo2 < 94 && <div style={{ fontSize: 13, color: '#dc2626' }}><b>🚨 LOW SPO2:</b> {record.vitals_spo2}% (Urgent Review Required)</div>}
                          </div>
                       </div>
                    </td>
                  </tr>
                )}
              </thead>
              <tbody>
                <tr>
                  <td colSpan={2} style={{ padding: '0 40px' }}>
                     <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, padding: '12px 20px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 24 }}>
                        <div><div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', marginBottom: 2 }}>BP (mmHg)</div><div style={{ fontSize: 14, fontWeight: 700 }}>{record.vitals_bp_sys}/{record.vitals_bp_dia}</div></div>
                        <div><div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', marginBottom: 2 }}>Pulse (bpm)</div><div style={{ fontSize: 14, fontWeight: 700 }}>{record.vitals_pulse}</div></div>
                        <div><div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', marginBottom: 2 }}>Temp (°F)</div><div style={{ fontSize: 14, fontWeight: 700 }}>{record.vitals_temp}</div></div>
                        <div><div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', marginBottom: 2 }}>SpO₂ (%)</div><div style={{ fontSize: 14, fontWeight: 700 }}>{record.vitals_spo2}</div></div>
                     </div>
                  </td>
                </tr>
               <tr>
                 <td>
                   {record.allergies && (
                     <div className={styles.previewSection} style={{ border: '2px solid #ef4444', padding: 12, borderRadius: 8, background: '#fef2f2' }}>
                       <h4 style={{ color: '#ef4444', margin: 0 }}>⚠️ CRITICAL ALLERGIES</h4>
                       <p style={{ color: '#991b1b', fontWeight: 800, fontSize: 16 }}>{record.allergies}</p>
                     </div>
                   )}
                   {record.past_surgeries && (
                     <div className={styles.previewSection}>
                       <h4>Previous Surgeries</h4>
                       <p>{record.past_surgeries}</p>
                     </div>
                   )}
                    <div className={styles.previewSection}>
                      <h4>🧠 Provisional Diagnosis</h4>
                      <p>{record.diagnosis}</p>
                    </div>
                   {record.doctor_observations && (
                     <div className={styles.previewSection} style={{ borderLeft: '3px solid #8b5cf6', paddingLeft: 12 }}>
                       <h4 style={{ color: '#8b5cf6' }}>Doctor Observations</h4>
                       <p style={{ fontStyle: 'italic' }}>{record.doctor_observations}</p>
                     </div>
                   )}
                   {record.hpi && (
                     <div className={styles.previewSection}>
                       <h4>📝 History of Present Illness (HPI)</h4>
                       <p style={{ whiteSpace: 'pre-wrap' }}>{record.hpi}</p>
                     </div>
                   )}
                    <div className={styles.previewSection}>
                      <h4>Chief Complaints</h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                        {Array.isArray(record.complaints) && record.complaints.map((c: string, i: number) => (
                          <span key={i} style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '4px 10px', borderRadius: 16, fontSize: 12, fontWeight: 700 }}>{c}</span>
                        ))}
                      </div>
                    </div>
                    <div className={styles.previewSection}>
                      <h4>🩺 Clinical Findings</h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                        {Array.isArray(record.findings) && record.findings.map((f: string, i: number) => (
                          <span key={i} style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '4px 10px', borderRadius: 16, fontSize: 12, fontWeight: 700 }}>{f}</span>
                        ))}
                      </div>
                    </div>
                    <div className={styles.previewSection}>
                      <h4>Investigations Advised</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                        {Array.isArray(record.investigations) && record.investigations.map((inv: any, i: number) => (
                           <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 4 }}>
                              <span style={{ fontSize: 13, fontWeight: 700 }}>{typeof inv === 'string' ? inv : inv.name}</span>
                              <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: (inv.status === 'Completed' ? '#059669' : '#b45309') }}>
                                 {inv.status === 'Completed' ? '✅ COMPLETED' : '⭕ PENDING'}
                              </span>
                           </div>
                        ))}
                      </div>
                    </div>
                    <div className={styles.previewSection}>
                      <h4>💊 Initial Treatment Plan</h4>
                      <ul style={{ paddingLeft: 20 }}>{Array.isArray(record.treatment_plan) && record.treatment_plan.map((t: string, i: number) => <li key={i}>{t}</li>)}</ul>
                    </div>
                     {record.attachments && record.attachments.length > 0 && (
                       <div className={styles.previewSection} style={{ marginTop: 32, borderTop: '2.5px solid #000', paddingTop: 16 }}>
                          <h4 style={{ color: '#000' }}>📎 ATTACHED DOCUMENTS</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                             {record.attachments.map((file: any, i: number) => (
                               <div key={i} style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #ddd', paddingBottom: 4 }}>
                                  <span>{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                                  <a href={file.url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', fontWeight: 800 }}>VIEW DOCUMENT</a>
                               </div>
                             ))}
                          </div>
                       </div>
                     )}
                 </td>
               </tr>
             </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
