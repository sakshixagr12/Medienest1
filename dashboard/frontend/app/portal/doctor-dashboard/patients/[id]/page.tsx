"use client";

import { useEffect, useState, use, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import styles from "./page.module.css";
import Link from "next/link";
import { API_BASE_URL, authenticatedFetch } from "@/lib/api";
import { useClinic } from "@/context/ClinicContext";

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
  allergies?: string[];
  chronicFlags?: string[];
  recentVisitsSummary: string;
  totalVisits?: number;
}

function PatientHubContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: patientId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const doctorId = searchParams?.get("doctorId");
  const doctorNameParam = searchParams?.get("doctorName");

  const getDoctorParams = () => {
    const params = new URLSearchParams();
    if (doctorId) params.set("doctorId", doctorId);
    if (doctorNameParam) params.set("doctorName", doctorNameParam);
    const qs = params.toString();
    return qs ? `&${qs}` : "";
  };
  const [patient, setPatient] = useState<Patient | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [summaries, setSummaries] = useState<any[]>([]); // New state for Discharge Summaries
  const [admissions, setAdmissions] = useState<any[]>([]); // New state for Admission Records
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams?.get("tab") || "Patient Summary");
  const [timelineFilter, setTimelineFilter] = useState("All");
  const [timelineSearch, setTimelineSearch] = useState("");

  // Sync activeTab with URL parameter
  useEffect(() => {
    const currentTab = searchParams?.get("tab");
    if (activeTab !== currentTab && activeTab !== "Patient Summary") {
      const p = new URLSearchParams(searchParams?.toString() || "");
      p.set("tab", activeTab);
      router.replace(`?${p.toString()}`, { scroll: false });
    } else if (activeTab === "Patient Summary" && currentTab) {
      const p = new URLSearchParams(searchParams?.toString() || "");
      p.delete("tab");
      router.replace(`?${p.toString()}`, { scroll: false });
    }
  }, [activeTab, searchParams, router]);
  const { clinic } = useClinic();

  const supabase = createClient();

  useEffect(() => {
    if (!clinic?.id || !patientId) return;

    const fetchPatientData = async () => {
      try {
        const response = await authenticatedFetch(
          `${API_BASE_URL}/api/patient-history/${patientId}?clinic_id=${clinic.id}`,
        );
        const data = await response.json();

        if (data.patient) setPatient(data.patient);
        if (data.visits) setVisits(data.visits);
        if (data.summaries) setSummaries(data.summaries); // Capture summaries
        if (data.admissions) setAdmissions(data.admissions); // Capture admissions
        if (data.summary) setSnapshot(data.summary);
      } catch (err) {
        console.error("Error fetching patient hub data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPatientData();
  }, [patientId, clinic?.id]);

  if (loading)
    return <div className={styles.loading}>Initializing Clinical Hub...</div>;

  const navItems = [
    {
      label: "Patient Summary",
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      ),
    },
    {
      label: "Clinical History",
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      ),
    },
    {
      label: "Medications",
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M10.5 20.5a7 7 0 1 1 9.9-9.9l-6.3 6.3a3.5 3.5 0 1 1-4.9-4.9l5.1-5.1"></path>
        </svg>
      ),
    },
    {
      label: "Admissions",
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M3 14h18M5 14v4M19 14v4M3 8h18M6 8V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3M12 4v4"></path>
        </svg>
      ),
    },
    {
      label: "Discharge Summaries",
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
          <polyline points="13 2 13 9 20 9"></polyline>
        </svg>
      ),
    },
    {
      label: "Lab Results",
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M10 2v8l-8 12h20l-8-12V2"></path>
          <line x1="6" y1="12" x2="18" y2="12"></line>
        </svg>
      ),
    },
    {
      label: "Encounters",
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M12 20h9"></path>
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
        </svg>
      ),
    },
  ];

  // Helper: Aggregate all medications from both OPD and IPD
  const allMeds = [
    ...(visits || []).reduce((acc: any[], v) => {
      const medsWithDate = (v.medicines || []).map((m) => ({
        ...m,
        date: v.visit_date,
        doctor: v.doctor,
        type: "OPD",
      }));
      return [...acc, ...medsWithDate];
    }, []),
    ...(summaries || []).reduce((acc: any[], s) => {
      // Robust Medicines Parsing with fallback for malformed JSON
      let parsedMeds = [];
      try {
        const rawMeds = s.medicines;
        parsedMeds = Array.isArray(rawMeds)
          ? rawMeds
          : typeof rawMeds === "string"
            ? JSON.parse(rawMeds)
            : [];
      } catch (e) {
        console.warn(
          `️ [HUB-SYNC] Failed to parse medicines for Summary: ${s.id}`,
        );
      }

      const medsWithDate = (parsedMeds || []).map((m: any) => ({
        ...m,
        dose: m.dose || m.frequency || "---",
        dur: m.dur || m.duration || "---",
        date: s.date_discharge || s.created_at,
        doctor: s.doctor_name,
        type: "IPD",
      }));
      return [...acc, ...medsWithDate];
    }, []),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const renderSummary = () => (
    <>
      <section className={styles.snapshotCard}>
        <div className={styles.snapGroup}>
          <h4>Bio-Metrics</h4>
          <div className={styles.snapValue}>{patient?.name}</div>
          <div style={{ marginTop: 8, opacity: 0.8 }}>
            {patient?.age} / {patient?.gender}
          </div>
          <div style={{ marginTop: 12, fontSize: 18, fontWeight: 700 }}>
            {patient?.contact}
          </div>
          {patient?.allergies && (
            <div className={styles.allergyBanner}>
              🚫 ALLERGIC: {patient.allergies}
            </div>
          )}
          {snapshot?.totalVisits != null && snapshot.totalVisits > 0 && (
            <div className={styles.visitCountBadge}>
              {snapshot.totalVisits} clinical visit{snapshot.totalVisits > 1 ? "s" : ""} on record
            </div>
          )}
        </div>

        <div className={styles.snapGroup}>
          <h4>🩺 Key Conditions</h4>
          <div className={styles.tagWrap}>
            {snapshot?.keyConditions ? (
              snapshot.keyConditions.map((c, i) => (
                <span key={i} className={styles.snapConditionTag}>{c}</span>
              ))
            ) : (
              <span className={styles.snapEmptyTag}>{loading ? "Calculating..." : "No conditions found"}</span>
            )}
          </div>

          {snapshot?.chronicFlags && snapshot.chronicFlags.length > 0 && (
            <>
              <h4 style={{ marginTop: 20 }}>⚠️ Chronic Conditions</h4>
              <div className={styles.tagWrap}>
                {snapshot.chronicFlags.map((f, i) => (
                  <span key={i} className={styles.snapChronicTag}>{f}</span>
                ))}
              </div>
            </>
          )}

          <h4 style={{ marginTop: 20 }}>💊 Medications</h4>
          <div className={styles.tagWrap}>
            {snapshot?.currentMedications ? (
              snapshot.currentMedications.map((m, i) => (
                <span key={i} className={styles.snapMedTag}>
                  {typeof m === "object" ? m.name : m}
                </span>
              ))
            ) : (
              <span className={styles.snapEmptyTag}>{loading ? "Analyzing Rx..." : "None listed"}</span>
            )}
          </div>

          {snapshot?.allergies && snapshot.allergies.length > 0 && (
            <>
              <h4 style={{ marginTop: 20 }}>🚫 Drug Allergies / Reactions</h4>
              <div className={styles.tagWrap}>
                {snapshot.allergies.map((a, i) => (
                  <span key={i} className={styles.snapAllergyTag}>{a}</span>
                ))}
              </div>
            </>
          )}
        </div>

        <div className={styles.snapGroup}>
          <div className={styles.visitSummary}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 12,
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2.5"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <span style={{ fontWeight: 800, fontSize: 13 }}>
                CLINICAL SUMMARY
              </span>
            </div>
            <p className={styles.summaryText}>
              {snapshot?.recentVisitsSummary}
            </p>
            <div
              style={{
                marginTop: 20,
                paddingTop: 16,
                borderTop: "1px solid rgba(255,255,255,0.1)",
                color: "#f59e0b",
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              IMPORTANT: Revisit for follow-up as advised.
            </div>
          </div>
        </div>
      </section>

      <div className={styles.sectionBox}>
        <h3>Quick Profile</h3>
        <div className={styles.profileGrid}>
          <div className={styles.profileItem}>
            <strong>Contact:</strong> {patient?.contact}
          </div>
          <div className={styles.profileItem}>
            <strong>Age:</strong> {patient?.age} Years
          </div>
          <div className={styles.profileItem}>
            <strong>Gender:</strong> {patient?.gender}
          </div>
          <div className={styles.profileItem}>
            <strong>Joined:</strong>{" "}
            {new Date(patient?.created_at || "").toLocaleDateString()}
          </div>
        </div>
      </div>

      {(patient?.has_diabetes ||
        patient?.has_hypertension ||
        patient?.has_thyroid ||
        patient?.past_surgeries) && (
        <div className={styles.sectionBox}>
          <h3>Medical Background</h3>
          <div className={styles.profileGrid}>
            <div className={styles.profileItem}>
              <strong>Comorbidities:</strong>{" "}
              {[
                patient.has_diabetes && "Diabetes",
                patient.has_hypertension && "Hypertension",
                patient.has_thyroid && "Thyroid",
              ]
                .filter(Boolean)
                .join(", ") || "None"}
            </div>
            <div
              className={styles.profileItem}
              style={{ gridColumn: "span 2" }}
            >
              <strong>Past Surgeries:</strong>{" "}
              {patient.past_surgeries || "None recorded"}
            </div>
          </div>
        </div>
      )}

      {admissions.length > 0 && (
        <div
          className={styles.sectionBox}
          style={{ borderLeft: `4px solid ${admissions[0].status === "Discharged" ? "#94a3b8" : "#3b82f6"}`, background: "#f8fafc" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
             <div>
                <h3 style={{ margin: 0, color: "#0f172a", fontSize: 16 }}>Current Admission</h3>
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>Admission #{admissions[0].id.slice(0, 8).toUpperCase()}</div>
             </div>
             {admissions[0].status === "Discharged" ? (
               <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#f1f5f9", padding: "4px 12px", borderRadius: 20, fontSize: 13, fontWeight: 700, color: "#64748b", border: "1px solid #e2e8f0" }}>
                  <span style={{ color: "#94a3b8" }}>⚪</span> Discharged
               </div>
             ) : (
               <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#ecfdf5", padding: "4px 12px", borderRadius: 20, fontSize: 13, fontWeight: 700, color: "#059669", border: "1px solid #a7f3d0" }}>
                  <span style={{ color: "#10b981" }}>🟢</span> Admitted
               </div>
             )}
          </div>
          
          <div className={styles.profileGrid} style={{ marginBottom: 24 }}>
             <div className={styles.profileItem}>
               <strong>Ward:</strong> {admissions[0].ward || "General Ward"}
             </div>
             <div className={styles.profileItem}>
               <strong>Consultant:</strong> Dr. {admissions[0].doctor_name}
             </div>
             <div className={styles.profileItem}>
               <strong>Admission Date:</strong> {new Date(admissions[0].date_admission).toLocaleString("en-GB", { day: "numeric", month: "short" })}
             </div>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
             {admissions[0].status === "Discharged" ? (
                <>
                  <Link 
                    href={`/portal/admission-record/view?id=${admissions[0].id}${getDoctorParams()}`} 
                    style={{ flex: 1, padding: "10px 16px", borderRadius: 8, fontSize: 14, fontWeight: 700, textAlign: "center", background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", textDecoration: "none" }}
                  >
                     View Admission
                  </Link>
                  <button 
                    onClick={async () => {
                      const { data } = await supabase.from("discharge_summaries").select("id").eq("patient_name", admissions[0].patient_name).eq("date_admission", admissions[0].date_admission).order("created_at", { ascending: false }).limit(1).single();
                      if (data?.id) window.location.href = `/portal/discharge-summary/view?id=${data.id}${getDoctorParams().replace('?', '&')}`;
                      else alert("Discharge summary not found.");
                    }}
                    style={{ flex: 1, padding: "10px 16px", borderRadius: 8, fontSize: 14, fontWeight: 700, textAlign: "center", background: "#f8fafc", color: "#0f172a", border: "1px solid #cbd5e1", cursor: "pointer" }}
                  >
                     View Discharge
                  </button>
                </>
             ) : (
                <>
                  <Link 
                    href={`/portal/admission-record?draftId=${admissions[0].id}&patientId=${patientId}${getDoctorParams().replace('?', '&')}`} 
                    style={{ flex: 1, padding: "10px 16px", borderRadius: 8, fontSize: 14, fontWeight: 700, textAlign: "center", background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", textDecoration: "none" }}
                  >
                     Continue Admission
                  </Link>
                  <Link 
                    href={`/portal/discharge-summary?patientId=${patientId}&admissionId=${admissions[0].id}${getDoctorParams().replace('?', '&')}`} 
                    style={{ flex: 1, padding: "10px 16px", borderRadius: 8, fontSize: 14, fontWeight: 700, textAlign: "center", background: "#2563eb", color: "#fff", border: "1px solid #2563eb", textDecoration: "none" }}
                  >
                     Create Discharge
                  </Link>
                </>
             )}
          </div>
        </div>
      )}
    </>
  );

  const renderHistory = () => {
    // 1. Merge and Normalize Data
    let timelineEvents: any[] = [];
    
    // OPD Visits
    (visits || []).forEach(v => {
      timelineEvents.push({
        id: v.prescription_id || `visit-${v.visit_date}`,
        type: 'OPD',
        date: new Date(v.visit_date),
        consultant: v.doctor,
        department: 'General Practice',
        diagnosisOrComplaint: v.complaints,
        raw: v
      });
    });

    // Admissions
    (admissions || []).forEach(a => {
      timelineEvents.push({
        id: a.id,
        type: 'Admission',
        date: new Date(a.date_admission),
        consultant: a.doctor_name,
        department: a.department,
        diagnosisOrComplaint: a.diagnosis || a.department,
        status: a.status,
        wardBed: `${a.ward || 'General'} / ${a.bed || '-'}`,
        raw: a
      });
    });

    // Discharges
    (summaries || []).forEach(s => {
      timelineEvents.push({
        id: s.id,
        type: 'Discharge',
        date: new Date(s.created_at || s.date_discharge),
        consultant: s.doctor_name,
        department: 'General Practice', // Usually carried over from admission
        diagnosisOrComplaint: s.diagnosis,
        condition: s.condition_at_discharge || 'Stable',
        raw: s
      });
    });

    // 2. Sort by Date Descending (Newest first)
    timelineEvents.sort((a, b) => b.date.getTime() - a.date.getTime());

    // 3. Filter
    const filteredEvents = timelineEvents.filter(e => {
      if (timelineFilter !== 'All' && e.type !== timelineFilter) return false;
      if (timelineSearch) {
        const term = timelineSearch.toLowerCase();
        const matches = 
          (e.consultant || '').toLowerCase().includes(term) ||
          (e.department || '').toLowerCase().includes(term) ||
          (e.diagnosisOrComplaint || '').toLowerCase().includes(term);
        if (!matches) return false;
      }
      return true;
    });

    return (
      <>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          <div style={{ display: "flex", flex: 1, minWidth: 200, alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 12, border: "1px solid #e2e8f0", background: "#fff" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: "#94a3b8" }}>
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="Search diagnosis, consultant, department..."
              value={timelineSearch}
              onChange={(e) => setTimelineSearch(e.target.value)}
              style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 15 }}
            />
          </div>
          <select 
            value={timelineFilter} 
            onChange={(e) => setTimelineFilter(e.target.value)}
            style={{ padding: "14px 16px", borderRadius: 12, border: "1px solid #e2e8f0", background: "#fff", outline: "none", fontWeight: 600, color: "#334155", minWidth: 150 }}
          >
            <option value="All">All Encounters</option>
            <option value="OPD">OPD Visits</option>
            <option value="Admission">Admissions</option>
            <option value="Discharge">Discharges</option>
          </select>
        </div>

        <section className={styles.timelineSection}>
          {filteredEvents.map((event, index) => (
            <div key={`${event.type}-${event.id}-${index}`} className={styles.timelineItem}>
              <div className={styles.timelineMarker} />
              <div className={styles.timelineCard}>
                <div className={styles.timelineHeader}>
                  <div className={styles.visitMeta}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {event.type === 'OPD' && '🩺 OPD Visit'}
                      {event.type === 'Admission' && '🏥 Admission'}
                      {event.type === 'Discharge' && '✅ Discharged'}
                    </h3>
                    <p style={{ marginTop: 4 }}>
                      {event.date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} • {event.date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  {event.type === 'Admission' ? (
                    <span className={styles.badge} style={event.status === 'Draft' ? { background: '#fef3c7', color: '#d97706' } : { background: '#ecfdf5', color: '#065f46' }}>
                      {event.status?.toUpperCase() || 'ADMITTED'}
                    </span>
                  ) : (
                    <span className={`${styles.badge} ${styles.badgeFollowUp}`}>
                      COMPLETED
                    </span>
                  )}
                </div>

                <div className={styles.visitDetails} style={{ marginTop: 16 }}>
                  {event.type === 'OPD' && (
                    <>
                      <div className={styles.detailBlock}>
                        <h5>Department & Consultant</h5>
                        <p style={{ fontSize: 15, color: "#334155", fontWeight: 600 }}>{event.department} • Dr. {event.consultant}</p>
                      </div>
                      <div className={styles.detailBlock}>
                        <h5>Chief Complaints</h5>
                        <div className={styles.complaintList}>
                          <p style={{ fontSize: 15, lineHeight: 1.6, color: "#334155" }}>• {event.diagnosisOrComplaint}</p>
                          {event.raw.findings && (
                            <p style={{ fontSize: 15, lineHeight: 1.6, color: "#334155" }}>• {event.raw.findings}</p>
                          )}
                        </div>
                      </div>
                      <div className={styles.detailBlock} style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                        <button className={styles.actionBtn} style={{ background: '#f1f5f9', color: '#0f172a', padding: '8px 16px', borderRadius: 8, fontWeight: 600, border: '1px solid #cbd5e1' }} onClick={() => alert("Viewing legacy OPD record...")}>
                          View Visit
                        </button>
                      </div>
                    </>
                  )}

                  {event.type === 'Admission' && (
                    <>
                      <div className={styles.profileGrid} style={{ marginBottom: 16 }}>
                        <div className={styles.profileItem}>
                          <strong>Department:</strong> {event.department || '---'}
                        </div>
                        <div className={styles.profileItem}>
                          <strong>Consultant:</strong> Dr. {event.consultant}
                        </div>
                        <div className={styles.profileItem}>
                          <strong>Ward / Bed:</strong> {event.wardBed}
                        </div>
                      </div>
                      <div className={styles.detailBlock}>
                        <h5>Diagnosis / Remarks</h5>
                        <p style={{ fontSize: 15, color: "#334155" }}>{event.diagnosisOrComplaint || 'Not specified'}</p>
                      </div>
                      <div className={styles.detailBlock} style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                        <Link href={`/portal/admission-record/view?id=${event.id}${getDoctorParams()}`} style={{ textDecoration: 'none', background: '#f1f5f9', color: '#0f172a', padding: '8px 16px', borderRadius: 8, fontWeight: 600, border: '1px solid #cbd5e1' }}>
                          View Admission
                        </Link>
                        {(!event.status || event.status !== 'Discharged') && (
                          <Link href={`/portal/admission-record?draftId=${event.id}&patientId=${patientId}${getDoctorParams().replace('?', '&')}`} style={{ textDecoration: 'none', background: '#eff6ff', color: '#2563eb', padding: '8px 16px', borderRadius: 8, fontWeight: 600, border: '1px solid #bfdbfe' }}>
                            Continue Admission
                          </Link>
                        )}
                      </div>
                    </>
                  )}

                  {event.type === 'Discharge' && (
                    <>
                      <div className={styles.profileGrid} style={{ marginBottom: 16 }}>
                        <div className={styles.profileItem}>
                          <strong>Consultant:</strong> Dr. {event.consultant}
                        </div>
                        <div className={styles.profileItem}>
                          <strong>Condition at Discharge:</strong> {event.condition}
                        </div>
                      </div>
                      <div className={styles.detailBlock}>
                        <h5>Final Diagnosis</h5>
                        <p style={{ fontSize: 15, color: "#334155", fontWeight: 600 }}>{event.diagnosisOrComplaint || '---'}</p>
                      </div>
                      <div className={styles.detailBlock} style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                        <Link href={`/portal/discharge-summary/view?id=${event.id}${getDoctorParams()}`} style={{ textDecoration: 'none', background: '#f1f5f9', color: '#0f172a', padding: '8px 16px', borderRadius: 8, fontWeight: 600, border: '1px solid #cbd5e1' }}>
                          View Discharge
                        </Link>
                        <Link href={`/portal/discharge-summary/view?id=${event.id}&print=true${getDoctorParams().replace('?', '&')}`} target="_blank" style={{ textDecoration: 'none', background: '#fff', color: '#0f172a', padding: '8px 16px', borderRadius: 8, fontWeight: 600, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                          Print
                        </Link>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
          {filteredEvents.length === 0 && (
            <div className={styles.emptyState}>No clinical history available.</div>
          )}
        </section>
      </>
    );
  };

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
              <td>
                <strong>{m.name}</strong>
              </td>
              <td>{m.dose}</td>
              <td>{m.freq || m.frequency}</td>
              <td>{m.dur}</td>
              <td>
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: 6,
                    fontSize: 10,
                    fontWeight: 900,
                    background: m.type === "IPD" ? "#fef3c7" : "#e0f2fe",
                    color: m.type === "IPD" ? "#92400e" : "#0369a1",
                  }}
                >
                  {m.type}
                </span>
              </td>
              <td>{new Date(m.date).toLocaleDateString()}</td>
              <td>{m.doctor}</td>
            </tr>
          ))}
          {allMeds.length === 0 && (
            <tr>
              <td colSpan={7} style={{ textAlign: "center", padding: 40 }}>
                No medications found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  const renderLabs = () => (
    <div className={styles.emptyHubState}>
      <div className={styles.emptyIcon}></div>
      <h2>No Lab Results Yet</h2>
      <p>
        Laboratory integrations and reports for {patient?.name} will appear
        here.
      </p>
      <button className={styles.btnSecondary} style={{ marginTop: 24 }}>
        Upload Report
      </button>
    </div>
  );

  const renderDischargeSummaries = () => (
    <div className={styles.sectionBox}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <h3>IPD Discharge Summaries</h3>
        <Link href={`/portal/discharge-summary?patientId=${patientId}${getDoctorParams().replace('?', '&')}`} className={styles.btnSecondary} style={{ fontSize: "13px", padding: "8px 16px", textDecoration: "none" }}>
          + Create Summary
        </Link>
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
              <td>
                <strong>{new Date(s.created_at).toLocaleDateString()}</strong>
              </td>
              <td>{s.diagnosis}</td>
              <td>Dr. {s.doctor_name}</td>
              <td>{s.reg_no || "---"}</td>
              <td>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Link
                    href={`/portal/discharge-summary/view?id=${s.id}${getDoctorParams()}`}
                    className={styles.tableAction}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      style={{ marginRight: 6 }}
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    View
                  </Link>
                  <span
                    style={{
                      fontSize: 10,
                      padding: "2px 6px",
                      background: "#ecfdf5",
                      color: "#065f46",
                      borderRadius: 4,
                      fontWeight: 900,
                    }}
                  >
                    RECORD ATTACHED
                  </span>
                </div>
              </td>
            </tr>
          ))}
          {summaries.length === 0 && (
            <tr>
              <td colSpan={5} style={{ textAlign: "center", padding: 40 }}>
                No discharge summaries found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  const renderAdmissions = () => (
    <div className={styles.sectionBox}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <h3>Admission Management</h3>
        <Link href={`/portal/admission-record?patientId=${patientId}${getDoctorParams().replace('?', '&')}`} className={styles.btnSecondary} style={{ fontSize: "13px", padding: "8px 16px", textDecoration: "none" }}>
          + Create Record
        </Link>
      </div>
      <table className={styles.hubTable}>
        <thead>
          <tr>
            <th>Date of Admission</th>
            <th>Bed / Ward</th>
            <th>Department</th>
            <th>Clinician</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {admissions.map((a, i) => (
            <tr key={i}>
              <td>
                {new Date(a.date_admission).toLocaleString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </td>
              <td>
                {a.ward || "---"} / {a.bed || "---"}
              </td>
              <td>{a.department || "---"}</td>
              <td>Dr. {a.doctor_name}</td>
              <td>
                <span
                  className={styles.badge}
                  style={
                    a.status === "Draft"
                      ? { background: "#fef3c7", color: "#d97706" }
                      : { background: "#ecfdf5", color: "#065f46" }
                  }
                >
                  {(a.status || "ADMITTED").toUpperCase()}
                </span>
              </td>
              <td>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {a.status === "Draft" ? (
                    <Link
                      href={`/portal/admission-record?draftId=${a.id}&patientId=${patientId}${getDoctorParams().replace('?', '&')}`}
                      className={styles.tableAction}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        style={{ marginRight: 6 }}
                      >
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                      Resume Draft
                    </Link>
                  ) : a.status === "Discharged" ? (
                    <>
                      <Link
                        href={`/portal/admission-record/view?id=${a.id}${getDoctorParams()}`}
                        className={styles.tableAction}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 6 }}>
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                        View Admission
                      </Link>
                      <button
                        onClick={async () => {
                          const { data, error } = await supabase
                            .from("discharge_summaries")
                            .select("id")
                            .eq("patient_name", a.patient_name)
                            .eq("date_admission", a.date_admission)
                            .order("created_at", { ascending: false })
                            .limit(1)
                            .single();
                          
                          if (data?.id) {
                            window.location.href = `/portal/discharge-summary/view?id=${data.id}${getDoctorParams().replace('?', '&')}`;
                          } else {
                            alert("Discharge summary not found.");
                          }
                        }}
                        className={styles.tableAction}
                        style={{ background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0 }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 6 }}>
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                        </svg>
                        View Discharge
                      </button>
                      <button
                        onClick={async () => {
                          const { data, error } = await supabase
                            .from("discharge_summaries")
                            .select("id")
                            .eq("patient_name", a.patient_name)
                            .eq("date_admission", a.date_admission)
                            .order("created_at", { ascending: false })
                            .limit(1)
                            .single();
                          
                          if (data?.id) {
                            window.open(`/portal/discharge-summary/view?id=${data.id}&print=true${getDoctorParams().replace('?', '&')}`, '_blank');
                          } else {
                            alert("Discharge summary not found.");
                          }
                        }}
                        className={styles.tableAction}
                        style={{ background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0 }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 6 }}>
                          <polyline points="6 9 6 2 18 2 18 9"></polyline>
                          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                          <rect x="6" y="14" width="12" height="8"></rect>
                        </svg>
                        Print Discharge
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href={`/portal/admission-record/view?id=${a.id}${getDoctorParams()}`}
                        className={styles.tableAction}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 6 }}>
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                        View
                      </Link>
                      <Link
                        href={`/portal/admission-record?draftId=${a.id}&patientId=${patientId}${getDoctorParams().replace('?', '&')}`}
                        className={styles.tableAction}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 6 }}>
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        Continue Admission
                      </Link>
                      <Link
                        href={`/portal/discharge-summary?patientId=${patientId}&admissionId=${a.id}${getDoctorParams().replace('?', '&')}`}
                        className={styles.tableAction}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 6 }}>
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                        </svg>
                        Create Discharge
                      </Link>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {admissions.length === 0 && (
            <tr>
              <td colSpan={6} style={{ textAlign: "center", padding: 40 }}>
                No admission records found.
              </td>
            </tr>
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
              <td>
                {new Date(v.visit_date).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </td>
              <td>
                {new Date(v.created_at || v.visit_date).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </td>
              <td>General Practice</td>
              <td>{v.doctor}</td>
              <td>
                <span
                  className={styles.badge}
                  style={{ background: "#e0f2fe", color: "#0369a1" }}
                >
                  COMPLETED
                </span>
              </td>
              <td>
                <button
                  className={styles.tableAction}
                  onClick={() => {
                    setActiveTab("Clinical History");
                  }}
                >
                  View Record
                </button>
              </td>
            </tr>
          ))}
          {visits.length === 0 && (
            <tr>
              <td colSpan={6} style={{ textAlign: "center", padding: 40 }}>
                No encounters found.
              </td>
            </tr>
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
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "var(--sanctuary-lavender)",
                  color: "var(--sanctuary-primary)",
                  fontSize: 32,
                  fontWeight: 900,
                }}
              >
                {patient?.name?.[0]}
              </div>
            </div>
            <h3 className={styles.profileName}>{patient?.name}</h3>
            <p className={styles.profileId}>
              ID: {patientId.slice(0, 8).toUpperCase()}
            </p>
          </div>

          <nav className={styles.nav}>
            {navItems.map((item) => (
              <button
                key={item.label}
                className={`${styles.navLink} ${activeTab === item.label ? styles.activeNavLink : ""}`}
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
              <button
                className={`${styles.actionBtn} ${styles.btnPrimary}`}
                onClick={() => {
                  const p = new URLSearchParams();
                  if (patientId) p.set("patientId", patientId);
                  if (doctorId) p.set("doctorId", doctorId);
                  if (doctorNameParam) p.set("doctorName", doctorNameParam);
                  const qs = p.toString();
                  router.push(`/portal/digital-prescription${qs ? `?${qs}` : ""}`);
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                >
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                New Visit
              </button>
              <Link 
                href={`/portal/doctor-dashboard/patients/${patientId}/export${getDoctorParams()}`} 
                target="_blank" 
                className={`${styles.actionBtn} ${styles.btnSecondary}`}
              >
                Export History
              </Link>
            </div>
          </div>

          {activeTab === "Patient Summary" && renderSummary()}
          {activeTab === "Clinical History" && renderHistory()}
          {activeTab === "Medications" && renderMedications()}
          {activeTab === "Admissions" && renderAdmissions()}
          {activeTab === "Discharge Summaries" && renderDischargeSummaries()}
          {activeTab === "Lab Results" && renderLabs()}
          {activeTab === "Encounters" && renderEncounters()}
        </main>
      </div>
    </DashboardLayout>
  );
}

export default function PatientHub(props: any) {
  return (
    <Suspense fallback={<div className={styles.loading}>Initializing Clinical Hub...</div>}>
      <PatientHubContent {...props} />
    </Suspense>
  );
}
