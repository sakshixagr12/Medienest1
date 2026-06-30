"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import { useClinic } from "@/context/ClinicContext";
import { createClient } from "@/lib/supabase/client";
import styles from "./page.module.css";

export default function AdmissionWorkspace() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { clinic, loading: clinicLoading } = useClinic();
  const supabase = createClient();

  const [record, setRecord] = useState<any>(null);
  const [dischargeSummary, setDischargeSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWorkspaceData() {
      if (!id || !clinic?.id) {
        setLoading(false);
        return;
      }

      // 1. Fetch Admission Record
      const { data: admissionData, error: admissionError } = await supabase
        .from("admission_records")
        .select("*")
        .eq("id", id)
        .eq("clinic_id", clinic.id)
        .single();

      if (admissionError || !admissionData) {
        console.error("Failed to fetch admission", admissionError);
        setLoading(false);
        return;
      }

      setRecord(admissionData);

      // 2. Fetch Discharge Summary if it exists
      const { data: dData, error: dError } = await supabase
        .from("discharge_summaries")
        .select("id, created_at")
        .eq("patient_name", admissionData.patient_name)
        .eq("date_admission", admissionData.date_admission)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (dData && !dError) {
        setDischargeSummary(dData);
      }

      setLoading(false);
    }

    fetchWorkspaceData();
  }, [id, clinic?.id]);

  if (clinicLoading || loading) {
    return (
      <div className={styles.workspacePage}>
        <TopBar title="Admission Workspace" />
        <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
          Loading workspace...
        </div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className={styles.workspacePage}>
        <TopBar title="Admission Workspace" />
        <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
          Admission record not found.
        </div>
      </div>
    );
  }

  // Helper to parse JSON fields safely
  const safeParse = (val: any) => {
    if (typeof val === "string") {
      try {
        const parsed = JSON.parse(val);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        return [];
      }
    }
    return Array.isArray(val) ? val : [];
  };

  const complaints = safeParse(record.complaints);
  const treatment = safeParse(record.treatment_plan);
  
  // Format dates
  const createdDate = new Date(record.created_at || record.date_admission).toLocaleDateString("en-IN", { 
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" 
  });
  
  const updatedDate = record.updated_at 
    ? new Date(record.updated_at).toLocaleDateString("en-IN", { 
        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" 
      }) 
    : createdDate;
    
  const dischargeDate = dischargeSummary?.created_at
    ? new Date(dischargeSummary.created_at).toLocaleDateString("en-IN", { 
        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" 
      }) 
    : null;

  return (
    <div className={styles.workspacePage}>
      <TopBar title="Admission Workspace" />
      
      <div className={styles.header}>
        <h1 className={styles.title}>{record.patient_name || "Unknown Patient"}</h1>
        <p className={styles.subtitle}>Admission ID: {record.id?.toUpperCase()}</p>
      </div>

      <div className={styles.grid}>
        
        {/* LEFT COLUMN */}
        <div className={styles.leftColumn}>
          
          {/* Patient & Admission Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Patient Information</h2>
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Patient Name</span>
                  <span className={styles.infoValue}>{record.patient_name || "-"}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Patient ID</span>
                  <span className={styles.infoValue}>{record.patient_id || record.id?.slice(0, 8).toUpperCase() || "-"}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Age / Gender</span>
                  <span className={styles.infoValue}>{record.age_sex || "-"}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Contact Number</span>
                  <span className={styles.infoValue}>{record.contact || "-"}</span>
                </div>
              </div>
            </div>

            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Admission Information</h2>
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Department</span>
                  <span className={styles.infoValue}>{record.department || "-"}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Consultant</span>
                  <span className={styles.infoValue}>{record.doctor_name || "-"}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Ward / Bed</span>
                  <span className={styles.infoValue}>
                    {record.ward || record.bed ? `${record.ward || "-"} / ${record.bed || "-"}` : "-"}
                  </span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Status</span>
                  <span className={styles.statusBadge}>{record.status?.toUpperCase()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Clinical Summary */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Clinical Summary (Read-Only)</h2>
            
            <div className={styles.clinicalSection}>
              <h3 className={styles.sectionTitle}>Chief Complaints</h3>
              <div className={styles.sectionContent}>
                {complaints.length > 0 && complaints.some((c: string) => c.trim() !== "") ? (
                  <ul style={{ margin: 0, paddingLeft: "20px" }}>
                    {complaints.map((c: string, i: number) => c.trim() && <li key={i}>{c}</li>)}
                  </ul>
                ) : (
                  <span className={styles.emptyContent}>No complaints recorded</span>
                )}
              </div>
            </div>

            <div className={styles.clinicalSection}>
              <h3 className={styles.sectionTitle}>Examination</h3>
              <div className={styles.sectionContent}>
                {record.examination_findings || <span className={styles.emptyContent}>No examination findings recorded</span>}
              </div>
            </div>

            <div className={styles.clinicalSection}>
              <h3 className={styles.sectionTitle}>Diagnosis</h3>
              <div className={styles.sectionContent}>
                {record.final_diagnosis || record.diagnosis || record.provisional_diagnosis || <span className={styles.emptyContent}>No diagnosis recorded</span>}
              </div>
            </div>

            <div className={styles.clinicalSection}>
              <h3 className={styles.sectionTitle}>Treatment Given</h3>
              <div className={styles.sectionContent}>
                {treatment.length > 0 && treatment.some((t: string) => t.trim() !== "") ? (
                  <ul style={{ margin: 0, paddingLeft: "20px" }}>
                    {treatment.map((t: string, i: number) => t.trim() && <li key={i}>{t}</li>)}
                  </ul>
                ) : (
                  <span className={styles.emptyContent}>No treatment plan recorded</span>
                )}
              </div>
            </div>
            
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className={styles.rightColumn}>
          
          {/* Quick Actions */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Quick Actions</h2>
            <div className={styles.quickActions}>
              <Link 
                href={`/demo/portal/admission-record?draftId=${record.id}&patientId=${record.patient_id || ""}`} 
                className={`${styles.btnAction} ${styles.btnPrimary}`}
              >
                Continue Admission
              </Link>
              
              {record.status?.toUpperCase() === "ADMITTED" ? (
                <Link 
                  href={`/demo/portal/discharge-summary?admissionId=${record.id}&patientId=${record.patient_id || ""}`} 
                  className={`${styles.btnAction} ${styles.btnSecondary}`}
                >
                  Create Discharge
                </Link>
              ) : (
                <Link 
                  href={`/demo/portal/discharge-summary?admissionId=${record.id}&patientId=${record.patient_id || ""}`} 
                  className={`${styles.btnAction} ${styles.btnSecondary}`}
                >
                  View Discharge
                </Link>
              )}

              <Link 
                href={`/demo/portal/admission-record/view?id=${record.id}`} 
                target="_blank"
                className={`${styles.btnAction} ${styles.btnOutline}`}
              >
                Print Admission
              </Link>
            </div>
          </div>

          {/* Timeline */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Timeline</h2>
            <div className={styles.timeline}>
              <div className={`${styles.timelineEvent} ${styles.completed}`}>
                <div className={styles.timelineDot}></div>
                <div className={styles.timelineDate}>{createdDate}</div>
                <div className={styles.timelineTitle}>Admission Created</div>
              </div>

              <div className={`${styles.timelineEvent} ${styles.completed}`}>
                <div className={styles.timelineDot}></div>
                <div className={styles.timelineDate}>{updatedDate}</div>
                <div className={styles.timelineTitle}>Last Updated</div>
              </div>

              {dischargeDate && (
                <div className={`${styles.timelineEvent} ${styles.completed}`}>
                  <div className={styles.timelineDot}></div>
                  <div className={styles.timelineDate}>{dischargeDate}</div>
                  <div className={styles.timelineTitle}>Discharge Completed</div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
