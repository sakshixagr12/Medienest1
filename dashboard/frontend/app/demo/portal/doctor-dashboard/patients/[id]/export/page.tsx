"use client";

import React, { useEffect, useState, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { API_BASE_URL, authenticatedFetch } from "@/lib/api";
import { useClinic } from "@/context/ClinicContext";
import styles from "./export.module.css";

export default function PatientHistoryExport({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: patientId } = use(params);
  const { clinic, user } = useClinic();
  const [patient, setPatient] = useState<any>(null);
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clinic?.id || !patientId) return;

    const fetchPatientData = async () => {
      try {
        const response = await authenticatedFetch(
          `${API_BASE_URL}/api/patient-history/${patientId}?clinic_id=${clinic.id}`,
        );
        const data = await response.json();

        if (data.patient) setPatient(data.patient);

        let events: any[] = [];

        // OPD Visits
        (data.visits || []).forEach((v: any) => {
          events.push({
            id: v.prescription_id || `visit-${v.visit_date}`,
            type: "OPD",
            date: new Date(v.visit_date),
            consultant: v.doctor,
            department: "General Practice",
            diagnosisOrComplaint: v.complaints,
            raw: v,
          });
        });

        // Admissions
        (data.admissions || []).forEach((a: any) => {
          events.push({
            id: a.id,
            type: "Admission",
            date: new Date(a.date_admission),
            consultant: a.doctor_name,
            department: a.department,
            diagnosisOrComplaint: a.diagnosis || a.department,
            status: a.status,
            wardBed: `${a.ward || "General"} / ${a.bed || "-"}`,
            raw: a,
          });
        });

        // Discharges
        (data.summaries || []).forEach((s: any) => {
          events.push({
            id: s.id,
            type: "Discharge",
            date: new Date(s.created_at || s.date_discharge),
            consultant: s.doctor_name,
            department: "General Practice",
            diagnosisOrComplaint: s.diagnosis,
            condition: s.condition_at_discharge || "Stable",
            raw: s,
          });
        });

        // Sort by Date Descending (Newest first)
        events.sort((a, b) => b.date.getTime() - a.date.getTime());
        setTimelineEvents(events);
      } catch (err) {
        console.error("Error fetching export data:", err);
      } finally {
        setLoading(false);
        // Automatically trigger print dialog after a brief delay for rendering
        setTimeout(() => {
          window.print();
        }, 500);
      }
    };

    fetchPatientData();
  }, [patientId, clinic?.id]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 50, fontFamily: "sans-serif" }}>
        Loading report data...
      </div>
    );
  }

  if (!patient) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 50, fontFamily: "sans-serif", color: "red" }}>
        Patient not found.
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.reportContainer}>
        <button className={styles.printBtn} onClick={() => window.print()}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
          Print Report
        </button>

        <header className={styles.reportHeader}>
          <h1 className={styles.reportTitle}>Patient Clinical History</h1>
        </header>

        {/* Patient Information Section */}
        <section>
          <h2 className={styles.sectionTitle}>Patient Information</h2>
          <div className={styles.patientInfoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Patient Name</span>
              <span className={styles.infoValue}>{patient.name || "-"}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Patient ID</span>
              <span className={styles.infoValue}>{patient.patient_id || patient.id.slice(0,8).toUpperCase()}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Age / Gender</span>
              <span className={styles.infoValue}>
                {patient.age ? `${patient.age} Yrs` : "-"} / {patient.gender || "-"}
              </span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Blood Group</span>
              <span className={styles.infoValue}>{patient.blood_group || "-"}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Phone Number</span>
              <span className={styles.infoValue}>{patient.contact || "-"}</span>
            </div>
          </div>
        </section>

        {/* Clinical Timeline Section */}
        <section>
          <h2 className={styles.sectionTitle}>Clinical Timeline</h2>
          {timelineEvents.length === 0 ? (
            <p style={{ color: "#64748b", fontSize: 14 }}>No clinical history available for this patient.</p>
          ) : (
            <div>
              {timelineEvents.map((event, index) => (
                <div key={`${event.type}-${event.id}-${index}`} className={styles.timelineEvent}>
                  <div className={styles.eventHeader}>
                    <span className={styles.eventDate}>
                      {event.date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                    <span className={styles.eventBadge}>
                      {event.type === "OPD" && "🩺 OPD Visit"}
                      {event.type === "Admission" && "🏥 Admission"}
                      {event.type === "Discharge" && "✅ Discharge"}
                    </span>
                  </div>

                  <div className={styles.eventGrid}>
                    {event.type === "OPD" && (
                      <>
                        <div className={styles.eventDetail}>
                          <span className={styles.detailLabel}>Complaint</span>
                          <span className={styles.detailValue}>{event.diagnosisOrComplaint || "-"}</span>
                        </div>
                        <div className={styles.eventDetail}>
                          <span className={styles.detailLabel}>Consultant</span>
                          <span className={styles.detailValue}>Dr. {event.consultant || "-"}</span>
                        </div>
                        <div className={styles.eventDetail} style={{ gridColumn: "1 / -1" }}>
                          <span className={styles.detailLabel}>Advice / Treatment</span>
                          <span className={styles.detailValue}>{event.raw.advice || "-"}</span>
                        </div>
                      </>
                    )}

                    {event.type === "Admission" && (
                      <>
                        <div className={styles.eventDetail}>
                          <span className={styles.detailLabel}>Department</span>
                          <span className={styles.detailValue}>{event.department || "-"}</span>
                        </div>
                        <div className={styles.eventDetail}>
                          <span className={styles.detailLabel}>Consultant</span>
                          <span className={styles.detailValue}>Dr. {event.consultant || "-"}</span>
                        </div>
                        <div className={styles.eventDetail}>
                          <span className={styles.detailLabel}>Diagnosis</span>
                          <span className={styles.detailValue}>{event.diagnosisOrComplaint || "-"}</span>
                        </div>
                        <div className={styles.eventDetail}>
                          <span className={styles.detailLabel}>Status</span>
                          <span className={styles.detailValue}>{event.status || "-"}</span>
                        </div>
                        <div className={styles.eventDetail} style={{ gridColumn: "1 / -1" }}>
                          <span className={styles.detailLabel}>Treatment / Notes</span>
                          <span className={styles.detailValue}>
                            {Array.isArray(event.raw.treatment_plan) 
                              ? event.raw.treatment_plan.map((t: any) => t.name).join(", ") 
                              : "See full admission record for details."}
                          </span>
                        </div>
                      </>
                    )}

                    {event.type === "Discharge" && (
                      <>
                        <div className={styles.eventDetail}>
                          <span className={styles.detailLabel}>Condition</span>
                          <span className={styles.detailValue}>{event.condition || "-"}</span>
                        </div>
                        <div className={styles.eventDetail}>
                          <span className={styles.detailLabel}>Follow-up</span>
                          <span className={styles.detailValue}>
                            {event.raw.follow_up_advice || "As advised"}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Doctor Notes Section */}
        <section>
          <h2 className={styles.sectionTitle} style={{ marginTop: 40 }}>Doctor Notes</h2>
          <div className={styles.doctorNotesArea}>
            {/* Blank space for doctor to handwrite notes on printed document */}
          </div>
        </section>

        {/* Footer */}
        <footer className={styles.footer}>
          <div>Generated On: {new Date().toLocaleString("en-GB")}</div>
          <div>Generated By: {user?.name || "Doctor"}</div>
        </footer>
      </div>
    </div>
  );
}
