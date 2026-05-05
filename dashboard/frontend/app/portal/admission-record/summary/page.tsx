'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './summary.module.css';

export default function AdmissionSummaryPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem('admission_summary_preview');
      if (raw) setData(JSON.parse(raw));
    } catch {
      setData(null);
    }
  }, []);

  if (!mounted) return null;

  if (!data) {
    return (
      <div className={styles.emptyState}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <h2>No Summary Available</h2>
        <p>Go back and fill in patient details first.</p>
        <button onClick={() => router.back()} className={styles.btnBack}>← Go Back</button>
      </div>
    );
  }

  const formatDate = (str: string) => {
    if (!str) return '—';
    try {
      return new Date(str).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return str; }
  };

  const severityColor: Record<string, string> = {
    Mild: '#15803d',
    Moderate: '#b45309',
    Severe: '#dc2626',
  };
  const sColor = severityColor[data.severity] || '#15803d';

  return (
    <div className={styles.page}>
      {/* Top Action Bar */}
      <div className={styles.topBar}>
        <button className={styles.btnBack} onClick={() => router.back()}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Back to Record
        </button>
        <div className={styles.topBarTitle}>Clinical Admission Summary</div>
        <div className={styles.topBarActions}>
          <button className={styles.btnPrint} onClick={() => window.print()}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Print
          </button>
          <button
            className={styles.btnCopy}
            onClick={() => {
              const lines = [
                `CLINICAL ADMISSION SUMMARY`,
                `━━━━━━━━━━━━━━━━━━━━━━━━`,
                data.patientName && `Patient: ${data.patientName}`,
                data.age && `Age/Sex: ${data.age} / ${data.sex || '—'}`,
                data.doctor && `Doctor: Dr. ${data.doctor}`,
                data.ward && `Ward/Bed: ${data.ward} – ${data.bed}`,
                data.department && `Dept: ${data.department}`,
                data.date_admission && `Admitted: ${formatDate(data.date_admission)}`,
                data.severity && `Severity: ${data.severity}`,
                ``,
                data.allergies && `⚠️ Allergies: ${data.allergies}`,
                ``,
                data.diagnosis && `Provisional Dx: ${data.diagnosis}`,
                data.final_diagnosis && `Final Dx: ${data.final_diagnosis}`,
                ``,
                data.complaints?.length && `Complaints: ${data.complaints.join(', ')}`,
                data.findings?.length && `Findings: ${data.findings.join(', ')}`,
                ``,
                data.vitals_pulse && `Vitals — Pulse: ${data.vitals_pulse} BPM | SpO₂: ${data.vitals_spo2 || '—'}% | BP: ${data.vitals_bp_sys || '—'}/${data.vitals_bp_dia || '—'} | Temp: ${data.vitals_temp || '—'}°F`,
              ].filter(Boolean).join('\n');
              navigator.clipboard.writeText(lines);
              alert('Summary copied to clipboard!');
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            Copy
          </button>
        </div>
      </div>

      {/* Main Summary Document */}
      <div className={styles.document} id="summary-doc">

        {/* Document Header */}
        <div className={styles.docHeader}>
          <div className={styles.docHeaderLeft}>
            <div className={styles.docLabel}>CLINICAL ADMISSION RECORD</div>
            <h1 className={styles.docPatientName}>{data.patientName || 'Unknown Patient'}</h1>
            <div className={styles.docMeta}>
              {data.age && <span>{data.age} yrs / {data.sex || '—'}</span>}
              {data.phone && <><span className={styles.metaSep}>•</span><span>{data.phone}</span></>}
            </div>
          </div>
          <div className={styles.docHeaderRight}>
            <div className={styles.docSeverityBadge} style={{ background: sColor + '18', color: sColor, border: `1.5px solid ${sColor}40` }}>
              <span className={styles.severityDot} style={{ background: sColor }} />
              {data.severity || 'Mild'}
            </div>
            <div className={styles.docMetaSmall}>
              {data.date_admission && <div>Admitted: {formatDate(data.date_admission)}</div>}
              {data.admission_type && <div>Type: {data.admission_type}</div>}
            </div>
          </div>
        </div>

        {/* Allergy Alert Banner */}
        {data.allergies?.trim() && (
          <div className={styles.allergyBanner}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <strong>ALLERGY ALERT:</strong>&nbsp;{data.allergies}
          </div>
        )}

        {/* Two-column info grid */}
        <div className={styles.infoGrid}>
          <div className={styles.infoCard}>
            <div className={styles.infoCardTitle}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
              Admission Details
            </div>
            <div className={styles.infoRows}>
              <div className={styles.infoRow}><span>Ward</span><strong>{data.ward || '—'}</strong></div>
              <div className={styles.infoRow}><span>Bed</span><strong>{data.bed || '—'}</strong></div>
              <div className={styles.infoRow}><span>Department</span><strong>{data.department || '—'}</strong></div>
              <div className={styles.infoRow}><span>Doctor</span><strong>{data.doctor ? `Dr. ${data.doctor}` : '—'}</strong></div>
              <div className={styles.infoRow}><span>Admitted</span><strong>{formatDate(data.date_admission)}</strong></div>
            </div>
          </div>

          <div className={styles.infoCard}>
            <div className={styles.infoCardTitle}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              Vitals
            </div>
            <div className={styles.vitalsGrid}>
              <div className={`${styles.vitalBox} ${data.vitals_pulse && parseInt(data.vitals_pulse) > 100 ? styles.vitalAbnormal : ''}`}>
                <div className={styles.vitalVal}>{data.vitals_pulse || '—'}</div>
                <div className={styles.vitalLabel}>Pulse (BPM)</div>
              </div>
              <div className={`${styles.vitalBox} ${data.vitals_spo2 && parseInt(data.vitals_spo2) < 94 ? styles.vitalCritical : ''}`}>
                <div className={styles.vitalVal}>{data.vitals_spo2 ? `${data.vitals_spo2}%` : '—'}</div>
                <div className={styles.vitalLabel}>SpO₂</div>
              </div>
              <div className={styles.vitalBox}>
                <div className={styles.vitalVal}>{data.vitals_bp_sys && data.vitals_bp_dia ? `${data.vitals_bp_sys}/${data.vitals_bp_dia}` : '—'}</div>
                <div className={styles.vitalLabel}>BP (mmHg)</div>
              </div>
              <div className={styles.vitalBox}>
                <div className={styles.vitalVal}>{data.vitals_temp ? `${data.vitals_temp}°F` : '—'}</div>
                <div className={styles.vitalLabel}>Temp</div>
              </div>
            </div>
          </div>
        </div>

        {/* Comorbidities */}
        {(data.has_diabetes || data.has_hypertension || data.has_thyroid || data.past_surgeries) && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Medical History</div>
            <div className={styles.comorbiditiesRow}>
              {data.has_diabetes && <span className={styles.comorbidBadge}>Diabetes</span>}
              {data.has_hypertension && <span className={styles.comorbidBadge}>Hypertension</span>}
              {data.has_thyroid && <span className={styles.comorbidBadge}>Thyroid</span>}
              {data.past_surgeries && <span className={styles.comorbidBadgeNeutral}>Surgeries: {data.past_surgeries}</span>}
            </div>
          </div>
        )}

        {/* Diagnosis */}
        <div className={styles.diagnosisRow}>
          {data.diagnosis && (
            <div className={styles.diagnosisCard}>
              <div className={styles.diagnosisLabel}>Provisional Diagnosis</div>
              <div className={styles.diagnosisText}>{data.diagnosis}</div>
            </div>
          )}
          {data.final_diagnosis && (
            <div className={`${styles.diagnosisCard} ${styles.finalDxCard}`}>
              <div className={styles.diagnosisLabel}>Final Diagnosis</div>
              <div className={styles.diagnosisText}>{data.final_diagnosis}</div>
            </div>
          )}
        </div>

        {/* HPI */}
        {data.hpi && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>History of Present Illness</div>
            <p className={styles.hpiText}>{data.hpi}</p>
          </div>
        )}

        {/* Complaints & Findings */}
        <div className={styles.clinicalGrid}>
          {data.complaints?.length > 0 && (
            <div className={styles.clinicalBlock}>
              <div className={styles.clinicalBlockTitle}>Chief Complaints</div>
              <ul className={styles.bulletList}>
                {data.complaints.map((c: string, i: number) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          )}
          {data.findings?.length > 0 && (
            <div className={styles.clinicalBlock}>
              <div className={styles.clinicalBlockTitle}>Clinical Findings</div>
              <ul className={styles.bulletList}>
                {data.findings.map((f: string, i: number) => <li key={i}>{f}</li>)}
              </ul>
            </div>
          )}
        </div>

        {/* Investigations */}
        {data.investigations?.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Investigations Advised</div>
            <div className={styles.investigationTable}>
              <div className={styles.investHeader}><span>Test</span><span>Status</span></div>
              {data.investigations.map((inv: any, i: number) => (
                <div key={i} className={styles.investRow}>
                  <span>{typeof inv === 'string' ? inv : inv.name}</span>
                  <span className={`${styles.investStatus} ${(inv.status === 'Completed') ? styles.statusDone : styles.statusPending}`}>
                    {typeof inv === 'string' ? 'Pending' : inv.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Treatment Plan */}
        {data.treatment_plan?.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Treatment Plan</div>
            <ul className={styles.bulletList}>
              {data.treatment_plan.map((t: string, i: number) => <li key={i}>{t}</li>)}
            </ul>
          </div>
        )}

        {/* Doctor Observations */}
        {data.doctor_observations && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Doctor Observations</div>
            <p className={styles.observationsText}>{data.doctor_observations}</p>
          </div>
        )}

        {/* Footer */}
        <div className={styles.docFooter}>
          <div>MediNest Clinical Record &nbsp;•&nbsp; Generated {new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
          <div>Confidential — For Medical Use Only</div>
        </div>
      </div>
    </div>
  );
}
