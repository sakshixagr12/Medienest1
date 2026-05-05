'use client';

import { useState, useEffect, use } from 'react';
import { createClient } from '@/lib/supabase/client';
import styles from '@/app/portal/discharge-summary/view/view.module.css';

export default function PublicDischargeSummary({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const supabase = createClient();
  const [summary, setSummary] = useState<any>(null);
  const [clinic, setClinic] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRecord() {
      try {
        const { data: record, error: recordError } = await supabase
          .from('discharge_summaries')
          .select('*')
          .eq('id', id)
          .single();

        if (recordError || !record) throw new Error('Record not found');

        // Parse JSON arrays safely
        const parsedSummary = {
          patientName: record.patient_name,
          regNo: record.reg_no,
          ageSex: record.age_sex,
          doctor: record.doctor_name,
          doa: record.date_admission,
          dod: record.date_discharge,
          diagnosis: record.diagnosis,
          complaints: typeof record.complaints === 'string' ? JSON.parse(record.complaints) : record.complaints || [],
          findings: typeof record.findings === 'string' ? JSON.parse(record.findings) : record.findings || [],
          treatment: typeof record.treatment === 'string' ? JSON.parse(record.treatment) : record.treatment || [],
          medicines: typeof record.medicines === 'string' ? JSON.parse(record.medicines) : record.medicines || [],
          advice: typeof record.advice === 'string' ? JSON.parse(record.advice) : record.advice || []
        };
        
        setSummary(parsedSummary);

        if (record.clinic_id) {
           const { data: cData } = await supabase.from('clinics').select('*').eq('id', record.clinic_id).single();
           if (cData) setClinic(cData);
        }

      } catch (err: any) {
        setError(err.message || 'Access Denied');
      } finally {
        setLoading(false);
      }
    }
    fetchRecord();
  }, [id]);

  if (loading) {
    return (
      <div className={styles.page} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Loading medical record...</p>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className={styles.page} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
        <h2 style={{ color: 'var(--sanctuary-red)' }}>Link Invalid</h2>
        <p>We could not find this Discharge Summary. It may have been deleted or the link is incorrect.</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Mobile/Web UI Header (Hidden when printing via CSS) */}
      <header className={styles.header}>
        <div style={{ color: 'var(--sanctuary-ink-m)', fontSize: 13, fontWeight: 600 }}>MediNest Secure Encrypted Link</div>
        <div className={styles.headerActions}>
           <button 
             className={styles.btnPrint} 
             onClick={() => window.print()}
           >
             🖨️ Print / Download PDF
           </button>
        </div>
      </header>

      <main className={styles.viewport}>
        {/* Render exact same A4 Printable Layout! */}
        <div className={styles.previewDoc}>
          <table className={styles.printableTable}>
            <thead>
              <tr>
                <td>
                  <div className={styles.previewHeader}>
                     <h2>{clinic?.name || 'MediNest Partner Clinic'}</h2>
                     <p>{clinic?.address}</p>
                     <p style={{ fontSize: 11, marginTop: 4 }}>{clinic?.phone}</p>
                     <div className={styles.docTitle}>DISCHARGE SUMMARY</div>
                  </div>
                  <div className={styles.previewInfoGrid}>
                     <div><b>Patient:</b> {summary.patientName}</div>
                     <div><b>Reg No:</b> {summary.regNo}</div>
                     <div><b>Age/Sex:</b> {summary.ageSex}</div>
                     <div><b>Consultant:</b> {summary.doctor}</div>
                     <div><b>DOA:</b> {summary.doa ? new Date(summary.doa).toLocaleDateString('en-IN') : '--'}</div>
                     <div><b>DOD:</b> {summary.dod ? new Date(summary.dod).toLocaleDateString('en-IN') : '--'}</div>
                  </div>
                </td>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div className={styles.previewSection}>
                    <h4>FINAL DIAGNOSIS</h4>
                    <p style={{ fontWeight: 600 }}>{summary.diagnosis || 'Pending'}</p>
                  </div>
                  
                  {summary.complaints.length > 0 && (
                    <div className={styles.previewSection}>
                      <h4>COMPLAINTS ON ADMISSION</h4>
                      <ul className={styles.previewList}>
                        {summary.complaints.map((item: string, i: number) => <li key={i}>{item}</li>)}
                      </ul>
                    </div>
                  )}

                  {summary.findings.length > 0 && (
                    <div className={styles.previewSection}>
                      <h4>CLINICAL FINDINGS</h4>
                      <ul className={styles.previewList}>
                        {summary.findings.map((item: string, i: number) => <li key={i}>{item}</li>)}
                      </ul>
                    </div>
                  )}

                  {summary.treatment.length > 0 && (
                    <div className={styles.previewSection}>
                      <h4>PROCEDURES & TREATMENT GIVEN</h4>
                      <ul className={styles.previewList}>
                        {summary.treatment.map((item: string, i: number) => <li key={i}>{item}</li>)}
                      </ul>
                    </div>
                  )}

                  {summary.medicines.length > 0 && (
                    <div className={styles.previewSection}>
                      <h4>DISCHARGE MEDICATIONS</h4>
                      <table className={styles.medsHtmlTable}>
                         <thead>
                           <tr>
                             <th style={{ width: 40}}>Sr.</th>
                             <th>Medicine Name</th>
                             <th>Frequency</th>
                             <th>Duration</th>
                           </tr>
                         </thead>
                         <tbody>
                            {summary.medicines.map((m: any, i: number) => (
                              <tr key={i}>
                                <td style={{ textAlign: 'center' }}>{i + 1}</td>
                                <td>{m.name}</td>
                                <td>{m.frequency}</td>
                                <td>{m.duration}</td>
                              </tr>
                            ))}
                         </tbody>
                      </table>
                    </div>
                  )}

                  {summary.advice.length > 0 && (
                     <div className={styles.previewSection} style={{ borderBottom: 'none' }}>
                        <h4>ADVICE ON DISCHARGE</h4>
                        <ul className={styles.previewList}>
                          {summary.advice.map((item: string, i: number) => <li key={i}>{item}</li>)}
                        </ul>
                     </div>
                  )}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td>
                  <div className={styles.previewFooter}>
                     <div style={{ textAlign: 'center' }}>
                       <p style={{ fontStyle: 'italic', color: '#666', fontSize: 11 }}>This is a computer generated document and does not require a physical signature.</p>
                     </div>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </main>
    </div>
  );
}
