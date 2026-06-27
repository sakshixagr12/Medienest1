"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useClinic } from "@/context/ClinicContext";
import { createClient } from "@/lib/supabase/client";
import styles from "./view.module.css";

// Types (Mirrored from main page)
interface Medicine {
  id: string;
  name: string;
  frequency: string;
  duration: string;
}

interface SummaryData {
  patientName: string;
  phone: string;
  age: string;
  sex: string;
  regNo: string;
  doa: string;
  dod: string;
  doctor: string;
  diagnosis: string;
  complaints: string[];
  findings: string[];
  treatment: string[];
  dischargeCondition: string[];
  advice: string[];
  medicines: Medicine[];
}

export default function WrappedFullResultPreview() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: 100, textAlign: "center" }}>Initializing...</div>
      }
    >
      <FullResultPreview />
    </Suspense>
  );
}
function FullResultPreview() {
  const router = useRouter();
  const { clinic, doctors, loading: clinicLoading } = useClinic();
  const supabase = createClient();
  const [summary, setSummary] = useState<SummaryData | null>(null);

  // Unified Action Bar State
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const searchParams = useSearchParams();

  useEffect(() => {
    const recordId = searchParams.get("id");

    const fetchData = async () => {
      // 1. Identify Target (ID from URL vs. Local Draft)

      if (recordId) {
        setIsFetching(true);
        setFetchError(null);
        console.info(
          "🛡️ [MEDI-HYDRATE] Fetching clinical record from database:",
          recordId,
        );

        try {
          const { data, error } = await supabase
            .from("discharge_summaries")
            .select("*")
            .eq("id", recordId)
            .single();

          if (error) {
            console.error("❌ [DB ERROR]", error);
            setFetchError(`Database error: ${error.message}`);
            return;
          }

          if (!data) {
            setFetchError("Clinical record not found in database.");
            return;
          }

          const safeParse = (val: any) => {
            if (!val) return [];
            try {
              const parsed = typeof val === "string" ? JSON.parse(val) : val;
              return Array.isArray(parsed) ? parsed : [];
            } catch (e) {
              console.warn(
                "⚠️ [PARSER] Failed to parse clinical field, defaulting to empty array",
              );
              return [];
            }
          };

          // Map demographic "Age / Sex" back to separate fields
          let ageVal = "";
          let sexVal = "Male";
          if (data.age_sex) {
            const parts = data.age_sex.split("/");
            ageVal = parts[0]?.trim() || "";
            const rawSex = (parts[1] || "").trim().toLowerCase();
            sexVal = rawSex === "f" || rawSex === "female" ? "Female" : "Male";
          }

          setSummary({
            patientName: data.patient_name || "Unnamed Patient",
            phone: "",
            age: ageVal,
            sex: sexVal,
            regNo: data.reg_no || "---",
            doa: data.date_admission || "---",
            dod: data.date_discharge || "---",
            doctor: data.doctor_name || "---",
            diagnosis: data.diagnosis || "Diagnosis not recorded",
            complaints: safeParse(data.complaints),
            findings: safeParse(data.findings),
            treatment: safeParse(data.treatment),
            dischargeCondition: safeParse(data.discharge_condition),
            advice: safeParse(data.advice),
            medicines: safeParse(data.medicines),
          });
          setSavedId(data.id);
          setIsSaved(true);
          console.info(
            "✅ [MEDI-HYDRATE] Hydration complete for:",
            data.patient_name,
          );
        } catch (err: any) {
          console.error("🔥 [CRITICAL] Hydration failed:", err);
          setFetchError(
            err.message ||
              "An unexpected error occurred during record hydration.",
          );
        } finally {
          setIsFetching(false);
        }
        return;
      }

      // 2. Editor Mode: Load from Local Draft
      const draftStr = localStorage.getItem("discharge_summary_draft");
      if (draftStr) {
        try {
          const draft = JSON.parse(draftStr);
          const migrate = (val: any) => {
            if (Array.isArray(val)) return val;
            if (typeof val === "string" && val.trim()) {
              return val
                .split("\n")
                .map((s) => s.replace(/^[•\-\*]\s*/, "").trim())
                .filter(Boolean);
            }
            return [];
          };

          setSummary({
            ...draft,
            complaints: migrate(draft.complaints),
            findings: migrate(draft.findings),
            treatment: migrate(draft.treatment),
            dischargeCondition: migrate(draft.dischargeCondition),
            advice: migrate(draft.advice),
          });
        } catch (e) {
          console.error("Failed to parse draft", e);
        }
      }
    };

    if (clinic?.id || !recordId) {
      // Only fetch if clinic is ready OR we are in local craft mode
      fetchData();
    }
  }, [supabase, searchParams, clinic?.id]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const executeSave = async (quiet = false): Promise<string | null> => {
    if (!summary || !summary.patientName) {
      if (!quiet)
        alert(
          "Patient Name represents the minimum requirement to save a clinical record.",
        );
      return null;
    }

    // Prevent duplicated saving if we already have the ID
    if (isSaved && savedId) return savedId;

    setIsSaving(true);
    try {
      let patientId: string | null = null;

      // --- PATIENT SYNC ENGINE ---
      if (clinic?.id) {
        // Advanced Lookup: Prioritize phone (contact) and name match
        let existingPatient = null;

        if (summary.phone) {
          const { data } = await supabase
            .from("patients")
            .select("*")
            .eq("contact", summary.phone)
            .eq("clinic_id", clinic.id)
            .maybeSingle();
          existingPatient = data;
        }

        if (!existingPatient) {
          // Fallback to name search if phone didn't yield result
          const { data } = await supabase
            .from("patients")
            .select("*")
            .eq("name", summary.patientName)
            .eq("clinic_id", clinic.id)
            .limit(1)
            .maybeSingle();
          existingPatient = data;
        }

        if (existingPatient?.id) {
          patientId = existingPatient.id;

          // --- AUTO-UPDATE DEMOGRAPHICS ---
          const newAge = parseInt(summary.age);
          const hasAgeChanged = newAge && existingPatient.age !== newAge;
          const hasGenderChanged =
            summary.sex && existingPatient.gender !== summary.sex;
          const hasNameChanged =
            summary.patientName && existingPatient.name !== summary.patientName;
          const hasContactChanged =
            summary.phone && existingPatient.contact !== summary.phone;

          if (
            hasAgeChanged ||
            hasGenderChanged ||
            hasNameChanged ||
            hasContactChanged
          ) {
            console.log("🔄 Syncing comprehensive patient demographics...", {
              age: newAge,
              sex: summary.sex,
              name: summary.patientName,
              contact: summary.phone,
            });

            await supabase
              .from("patients")
              .update({
                age: newAge || existingPatient.age,
                gender: summary.sex || existingPatient.gender,
                name: summary.patientName || existingPatient.name,
                contact: summary.phone || existingPatient.contact,
              })
              .eq("id", patientId);
          }
        } else {
          // Auto-create patient profile
          const { data: newPatient, error: patientError } = await supabase
            .from("patients")
            .insert({
              name: summary.patientName,
              contact: summary.phone || "0000000000", // Default if missing
              age: parseInt(summary.age) || null,
              gender: summary.sex,
              clinic_id: clinic.id,
            })
            .select("id")
            .single();

          if (!patientError && newPatient?.id) {
            patientId = newPatient.id;
          }
        }
      }

      // --- DISCHARGE SUMMARY SAVE ---
      const payload: any = {
        patient_name: summary.patientName,
        reg_no: summary.regNo,
        age_sex: `${summary.age} / ${summary.sex}`,
        doctor_name: summary.doctor,
        date_admission: summary.doa,
        date_discharge: summary.dod,
        diagnosis: summary.diagnosis,
        complaints: JSON.stringify(summary.complaints),
        findings: JSON.stringify(summary.findings),
        treatment: JSON.stringify(summary.treatment),
        discharge_condition: JSON.stringify(summary.dischargeCondition),
        medicines: JSON.stringify(summary.medicines),
        advice: JSON.stringify(summary.advice),
        clinic_id: clinic?.id,
        patient_id: patientId, // Direct Linkage
      };

      let { data, error } = await supabase
        .from("discharge_summaries")
        .insert([payload])
        .select("id");

      if (error) throw error;

      let newId = savedId;
      if (data && data[0]) {
        newId = data[0].id;
        setSavedId(newId);
      }

      setIsSaved(true);
      if (!quiet) {
        setShowSuccessModal(true);
        // Also keep toast for secondary confirmation if modal closed
        showToast("Discharge Summary Saved Successfully");
      }
      return newId;
    } catch (e: any) {
      if (!quiet) alert("Error saving record: " + e.message);
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = async () => {
    if (!isSaved) {
      // Best-effort background save. Do not block the clinician from printing a draft.
      await executeSave(true);
    }

    // De-couple from the async transaction to prevent browser gesture-blocking
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleWhatsAppShare = async () => {
    let activeId = savedId;

    if (!activeId) {
      // Best-effort background save to acquire ID
      activeId = await executeSave(true);
    }

    if (!activeId) {
      alert(
        "Missing Document ID. Please fill out required fields or try saving again.",
      );
      return;
    }

    const docName = summary?.doctor ? `Dr. ${summary.doctor}` : clinic?.name;
    const shareLink = `${window.location.origin}/view-summary/${activeId}`;

    const message =
      `🏥 *${clinic?.name || "MedieNest Clinic"}*\n` +
      `━━━━━━━━━━━━━━━\n` +
      `Hello *${summary?.patientName || "Patient"}*,\n\n` +
      `Your Discharge Summary from *${docName}* is ready. You can view, download, or print your official clinical record securely here:\n` +
      `🔗 ${shareLink}\n\n` +
      `_Thank you for trusting us with your care!_ 🙏`;

    setTimeout(() => {
      // Strip all non-numeric characters for the WhatsApp DeepLink
      const cleanPhone = summary?.phone ? summary.phone.replace(/\D/g, "") : "";
      const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
      window.open(url, "_blank");
    }, 150);
  };

  if (clinicLoading || isFetching) {
    return (
      <div
        className={styles.page}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fff",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div className={styles.loaderSpinner} />
          <p style={{ marginTop: 20, color: "#64748b", fontWeight: 600 }}>
            Fetching clinical record...
          </p>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div
        className={styles.page}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            textAlign: "center",
            maxWidth: 400,
            padding: 40,
            background: "#fff",
            borderRadius: 20,
            boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 20 }}>⚠️</div>
          <h3 style={{ marginBottom: 12 }}>Unable to load record</h3>
          <p style={{ color: "#64748b", marginBottom: 24 }}>{fetchError}</p>
          <button
            className={styles.btnBack}
            style={{ margin: "0 auto" }}
            onClick={() => router.back()}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div
        className={styles.page}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <p>No document draft found.</p>
          <button
            className={styles.btnBack}
            style={{ marginTop: 20 }}
            onClick={() => router.back()}
          >
            Return to Editor
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {toast && (
        <div className={styles.toast} role="alert">
          {toast}
        </div>
      )}

      {showSuccessModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.successModal}>
            <div className={styles.modalContent}>
              <div className={styles.successIcon}>
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <h3>Summary Saved Successfully</h3>
              <p>
                This discharge summary has been officially linked to{" "}
                <strong>{summary.patientName}</strong>'s clinical record.
              </p>

              <div className={styles.modalActions}>
                <button
                  className={styles.btnGotIt}
                  onClick={() => setShowSuccessModal(false)}
                >
                  Got it
                </button>
                <button
                  className={styles.btnViewHub}
                  onClick={() => {
                    const params = new URLSearchParams();
                    const dId = searchParams.get("doctorId");
                    const dName = searchParams.get("doctorName");
                    if (dId) params.set("doctorId", dId);
                    if (dName) params.set("doctorName", dName);
                    const qs = params.toString();
                    router.push(`/demo1/portal/doctor-dashboard${qs ? `?${qs}` : ""}`); // Redirect to dashboard or specific patient if we have UUID
                  }}
                >
                  Go to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={styles.page}>
        <header className={styles.header}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className={styles.btnBack} onClick={() => router.back()}>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              {searchParams.get("id")
                ? "Back to Patient Record"
                : "Back to Editor"}
            </button>
            <div
              style={{
                color: "var(--sanctuary-ink-l)",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Preview Mode
            </div>
          </div>

          <div className={styles.headerActions}>
            <button
              className={styles.btnSave}
              onClick={() => executeSave(false)}
              disabled={isSaving || isSaved}
            >
              {isSaving ? "Saving..." : isSaved ? "✓ Saved" : "Save Summary"}
            </button>
            <button
              className={styles.btnPrint}
              onClick={handlePrint}
              disabled={isSaving}
            >
              🖨️ Print
            </button>
            <button
              className={styles.btnWhatsapp}
              onClick={handleWhatsAppShare}
              disabled={isSaving}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
              </svg>
              WhatsApp
            </button>
          </div>
        </header>

        <main className={styles.viewport}>
          <div className={styles.previewDoc}>
            <table className={styles.printableTable}>
              <thead>
                <tr>
                  <td>
                    <div className={styles.previewHeader}>
                      <div className={styles.headerLeft}>
                        <h2>{clinic?.name?.toLowerCase() || "daddy hospital"}</h2>
                        <p>{clinic?.address || "bhapar road, basti"}</p>
                        <p>Phone: {summary.phone || "7301018207"}</p>
                      </div>
                      <div className={styles.logoBox}>Logo</div>
                    </div>
                    
                    <div className={styles.titleStrip}>
                        DISCHARGE SUMMARY
                    </div>

                    <div className={styles.previewInfoGrid}>
                      <div>
                        <div className={styles.infoRow}>
                          <span className={styles.infoLabel}>Patient Name</span>
                          <span className={styles.infoColon}>:</span>
                          <span className={styles.infoValue}>{summary.patientName || <span className={styles.emptyPlaceholder}>[Not Provided]</span>}</span>
                        </div>
                        <div className={styles.infoRow}>
                          <span className={styles.infoLabel}>Age / Sex</span>
                          <span className={styles.infoColon}>:</span>
                          <span className={styles.infoValue}>{summary.age} Years / {summary.sex}</span>
                        </div>
                        <div className={styles.infoRow}>
                          <span className={styles.infoLabel}>Reg. / IPD No.</span>
                          <span className={styles.infoColon}>:</span>
                          <span className={styles.infoValue}>{summary.regNo || "---"}</span>
                        </div>
                      </div>
                      
                      <div>
                        <div className={styles.infoRow}>
                          <span className={styles.infoLabel}>Date of Admission</span>
                          <span className={styles.infoColon}>:</span>
                          <span className={styles.infoValue}>{summary.doa ? new Date(summary.doa).toLocaleString() : "---"}</span>
                        </div>
                        <div className={styles.infoRow}>
                          <span className={styles.infoLabel}>Date of Discharge</span>
                          <span className={styles.infoColon}>:</span>
                          <span className={styles.infoValue}>{summary.dod ? new Date(summary.dod).toLocaleString() : "---"}</span>
                        </div>
                        <div className={styles.infoRow}>
                          <span className={styles.infoLabel}>Consultant</span>
                          <span className={styles.infoColon}>:</span>
                          <span className={styles.infoValue}>Dr. {summary.doctor || "A"}</span>
                        </div>
                        <div className={styles.infoRow}>
                          <span className={styles.infoLabel}>Discharge To</span>
                          <span className={styles.infoColon}>:</span>
                          <span className={styles.infoValue}>{summary.dischargeDestination || "basti, up"}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td>
                    <div className={styles.previewSection} style={{ borderTop: "none", paddingTop: 0 }}>
                      <h4>Final Diagnosis</h4>
                      {summary.diagnosis ? (
                        <p>{summary.diagnosis}</p>
                      ) : (
                        <p className={styles.emptyPlaceholder}>Diagnosis not recorded</p>
                      )}
                    </div>
                    
                    <div className={styles.previewSection}>
                      <h4>Clinical Summary</h4>
                      {summary.complaints.length > 0 ? (
                        <div style={{ marginBottom: "12px" }}>
                          <strong style={{ display: "block", color: "#1e293b", fontSize: "13px", marginBottom: "4px" }}>Chief Complaints:</strong>
                          <p>{summary.complaints.join("; ")}</p>
                        </div>
                      ) : null}
                      
                      {summary.findings.length > 0 ? (
                        <div>
                          <strong style={{ display: "block", color: "#1e293b", fontSize: "13px", marginBottom: "4px" }}>Physical Findings & Hospital Course:</strong>
                          <p>{summary.findings.join("; ")}</p>
                        </div>
                      ) : null}
                      
                      {summary.complaints.length === 0 && summary.findings.length === 0 && (
                        <p className={styles.emptyPlaceholder}>No clinical summary recorded.</p>
                      )}
                    </div>

                    <div className={styles.previewSection}>
                      <h4>Treatment Provided</h4>
                      {summary.treatment.length > 0 ? (
                        <p>{summary.treatment.join("; ")}</p>
                      ) : (
                        <p className={styles.emptyPlaceholder}>Conservative management.</p>
                      )}
                    </div>

                    {summary.medicines.length > 0 && (
                      <div
                        className={`${styles.previewSection} ${styles.medPreviewSection}`}
                      >
                        <h4>Medications Advised on Discharge</h4>
                        <table className={styles.medTable}>
                          <thead>
                            <tr>
                              <th>Medicine Name</th>
                              <th>Frequency</th>
                              <th>Duration</th>
                            </tr>
                          </thead>
                          <tbody>
                            {summary.medicines.map((m) => (
                              <tr key={m.id}>
                                <td>{m.name || "---"}</td>
                                <td>{m.frequency}</td>
                                <td>{m.duration}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <div className={styles.previewSection}>
                      <h4>Condition at Discharge</h4>
                      {summary.dischargeCondition && summary.dischargeCondition.length > 0 ? (
                        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                          {summary.dischargeCondition.map((c, i) => (
                            <li key={i} style={{ marginBottom: 6 }}>
                              • {c}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p>Stable</p>
                      )}
                    </div>

                    <div className={styles.previewSection}>
                      <h4>Follow-up Instructions</h4>
                      {summary.advice.length > 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginLeft: "16px" }}>
                          {(() => {
                            const grouped: Record<string, string[]> = {};
                            const custom: string[] = [];
                            
                            summary.advice.forEach((a: string) => {
                               if (!a.trim()) return;
                               const match = a.match(/^([A-Z_-]+):\s*(.*)$/);
                               if (match) {
                                  const cat = match[1];
                                  const text = match[2];
                                  if (!text.trim()) return;
                                  if (!grouped[cat]) grouped[cat] = [];
                                  grouped[cat].push(text);
                               } else {
                                  custom.push(a);
                               }
                            });

                            const catLabels: Record<string, string> = {
                                "FOLLOW-UP": "Follow-up",
                                "DIET": "Diet",
                                "FLUIDS": "Fluids",
                                "ACTIVITY": "Activity",
                                "WARNING_SIGNS": "Warning Signs",
                                "INVESTIGATION": "Investigation"
                            };

                            const sections = [];
                            
                            for (const cat in grouped) {
                               const label = catLabels[cat] || cat;
                               sections.push(
                                  <div key={cat} style={{ display: "flex", gap: "6px" }}>
                                    <span style={{ color: "#000" }}>•</span>
                                    <div>
                                      <strong style={{ color: "#1e293b", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}:</strong>
                                      <div style={{ marginTop: "4px" }}>
                                        {grouped[cat].map((text, i) => <div key={i} style={{ color: "#000", fontSize: "13px" }}>{label === "Follow-up" ? "" : `${label}: `}{text}</div>)}
                                      </div>
                                    </div>
                                  </div>
                               );
                            }

                            if (custom.length > 0) {
                               sections.push(
                                  <div key="custom">
                                     {custom.map((text, i) => (
                                       <div key={i} style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
                                         <span style={{ color: "#000" }}>•</span>
                                         <div style={{ color: "#000", fontSize: "13px" }}>{text}</div>
                                       </div>
                                     ))}
                                  </div>
                               );
                            }

                            return sections;
                          })()}
                        </div>
                      ) : (
                        <p className={styles.emptyPlaceholder}>General post-discharge care.</p>
                      )}
                    </div>
                  </td>
                </tr>
              </tbody>

              <tfoot>
                <tr>
                  <td>
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 900 }}>
                        Dr. {summary.doctor || "(Authorized Signature)"}
                      </div>
                      <div style={{ fontSize: 11, color: "#444" }}>
                        Clinic Consultant / Chief Resident
                      </div>
                      <div
                        style={{ fontSize: 10, color: "#999", marginTop: 8 }}
                      >
                        Generated via MedieNest EMR Platform
                      </div>
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </main>
      </div>
    </>
  );
}
