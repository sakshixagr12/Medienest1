"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TopBar from "@/components/TopBar";
import { useClinic } from "@/context/ClinicContext";
import { createClient } from "@/lib/supabase/client";
import { API_BASE_URL, authenticatedFetch } from "@/lib/api";
import styles from "./page.module.css";

// Types
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
  advice: string[];
  medicines: Medicine[];
}

interface Suggestion {
  field: string;
  index: number;
  text: string;
  fullText: string;
}

const SECTION_SEQUENCE = ["complaints", "findings", "treatment", "advice"];

// --- STANDALONE REUSABLE STRUCTURED LIST COMPONENT WITH SMART ASSIST ---
interface BulletListEditorProps {
  field: keyof SummaryData;
  items: string[];
  placeholder: string;
  updateField: (field: keyof SummaryData, value: any) => void;
  autoSaveStatus: string;
  setAutoSaveStatus: (status: "idle" | "saving" | "saved") => void;
  suggestTimer: React.MutableRefObject<NodeJS.Timeout | null>;
  activeSuggestion: Suggestion | null;
  setActiveSuggestion: (suggestion: Suggestion | null) => void;
  fetchSmartSuggestion: (
    field: string,
    index: number,
    currentText: string,
  ) => void;
}

const BulletListEditor = ({
  field,
  items,
  placeholder,
  updateField,
  autoSaveStatus,
  setAutoSaveStatus,
  suggestTimer,
  activeSuggestion,
  setActiveSuggestion,
  fetchSmartSuggestion,
}: BulletListEditorProps) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const updateItem = (index: number, val: string) => {
    const newItems = [...items];
    newItems[index] = val;
    updateField(field, newItems);

    // Reset auto-save status to idle to restart the timer correctly during typing
    if (autoSaveStatus !== "idle") setAutoSaveStatus("idle");

    // Debounced Suggestion Trigger
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    suggestTimer.current = setTimeout(() => {
      fetchSmartSuggestion(field, index, val);
    }, 300); // Faster suggestion
  };

  const acceptSuggestion = (index: number) => {
    if (activeSuggestion && activeSuggestion.index === index) {
      const newItems = [...items];
      newItems[index] = activeSuggestion.fullText;
      updateField(field, newItems);
      setActiveSuggestion(null);
    }
  };

  const addItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index + 1, 0, "");
    updateField(field, newItems);
    setActiveSuggestion(null);
    setTimeout(() => inputRefs.current[index + 1]?.focus(), 0);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) {
      updateField(field, [""]);
      return;
    }
    const newItems = items.filter((_, i) => i !== index);
    updateField(field, newItems);
    setActiveSuggestion(null);
    setTimeout(() => inputRefs.current[Math.max(0, index - 1)]?.focus(), 0);
  };

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (
      e.key === "Tab" &&
      activeSuggestion &&
      activeSuggestion.index === index
    ) {
      e.preventDefault();
      acceptSuggestion(index);
    } else if (e.key === "Escape") {
      setActiveSuggestion(null);
    } else if (e.key === "Enter") {
      e.preventDefault();
      addItem(index);
    } else if (
      e.key === "Backspace" &&
      items[index] === "" &&
      items.length > 1
    ) {
      e.preventDefault();
      removeItem(index);
    }
  };

  return (
    <div className={styles.bulletListContainer}>
      {items.length === 0 ? (
        <button
          className={styles.btnAddPoint}
          onClick={() => updateField(field, [""])}
        >
          + Start adding {field}
        </button>
      ) : (
        items.map((item, idx) => (
          <div key={idx} className={styles.bulletRow}>
            <div className={styles.bulletMarker} />
            <div className={styles.inputWrapper}>
              <input
                ref={(el) => {
                  inputRefs.current[idx] = el;
                }}
                className={styles.bulletInput}
                value={item}
                onChange={(e) => updateItem(idx, e.target.value)}
                onKeyDown={(e) => onKeyDown(e, idx)}
                onBlur={() => setTimeout(() => setActiveSuggestion(null), 200)}
                placeholder={idx === 0 ? placeholder : "Next point..."}
              />
              {activeSuggestion &&
                activeSuggestion.field === field &&
                activeSuggestion.index === idx && (
                  <div className={`${styles.ghostText} ${styles.active}`}>
                    <span
                      style={{ color: "transparent", visibility: "hidden" }}
                    >
                      {item}
                    </span>
                    {activeSuggestion.text}
                    <span className={styles.ghostHint}>TAB</span>
                  </div>
                )}
            </div>
            <button
              className={styles.btnRemovePoint}
              onClick={() => removeItem(idx)}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
              </svg>
            </button>
          </div>
        ))
      )}
      <button
        className={styles.btnAddPoint}
        onClick={() => addItem(items.length - 1)}
      >
        + Add another point
      </button>
    </div>
  );
};

function DischargeSummaryRedesign() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { clinic, doctors, loading: clinicLoading } = useClinic();
  const supabase = createClient();

  // 1. Unified State
  const [summary, setSummary] = useState<SummaryData>({
    patientName: "",
    phone: "",
    age: "",
    sex: "Male",
    regNo: "",
    doa: "",
    dod: "",
    doctor: "",
    diagnosis: "",
    complaints: [],
    findings: [],
    treatment: [],
    advice: [],
    medicines: [],
  });

  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [activeSuggestion, setActiveSuggestion] = useState<Suggestion | null>(
    null,
  );

  // UX Feedback State
  const [autoSaveStatus, setAutoSaveStatus] = useState<
    "idle" | "saving" | "saved"
  >("idle");
  const [toast, setToast] = useState<string | null>(null);
  const [showFullScreenPreview, setShowFullScreenPreview] = useState(false);
  const [isMedEditorOpen, setIsMedEditorOpen] = useState(false);

  // Refs for debounce
  const suggestTimer = useRef<NodeJS.Timeout | null>(null);

  // 2. Load Draft with Migration Logic
  useEffect(() => {
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
          advice: migrate(draft.advice),
        });
      } catch (e) {
        console.error("Failed to parse draft", e);
      }
    }
  }, []);

  // 3. Auto-save
  const saveDraft = useCallback((data: SummaryData) => {
    localStorage.setItem("discharge_summary_draft", JSON.stringify(data));
    setLastSaved(new Date());
    setAutoSaveStatus("saved");
    setTimeout(() => setAutoSaveStatus("idle"), 2000);
  }, []);

  useEffect(() => {
    if (autoSaveStatus === "idle") {
      const timer = setTimeout(() => {
        setAutoSaveStatus("saving");
        saveDraft(summary);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [summary, saveDraft, autoSaveStatus]);

  const updateField = (field: keyof SummaryData, value: any) => {
    setSummary((prev) => ({ ...prev, [field]: value }));
  };

  // --- SMART ASSIST ENGINE ---
  const fetchSmartSuggestion = async (
    field: string,
    index: number,
    currentText: string,
  ) => {
    if (!currentText || currentText.trim().split(" ").length < 2) {
      setActiveSuggestion(null);
      return;
    }

    // Context-aware Intelligent Completion Mock
    const input = currentText.toLowerCase();
    let baseSuggestion = "";

    // Logic for Complaints
    if (field === "complaints") {
      if (input.includes("chest pain")) {
        if (
          summary.diagnosis.toLowerCase().includes("acs") ||
          summary.diagnosis.toLowerCase().includes("heart")
        )
          baseSuggestion = " radiating to left arm and sweating";
        else baseSuggestion = " associated with breathlessness";
      } else if (input.includes("fever"))
        baseSuggestion = " associated with chills and rigor";
      else if (input.includes("cough"))
        baseSuggestion = " with yellowish expectoration for 3 days";
    }
    // Logic for Findings
    else if (field === "findings") {
      if (input.includes("pulse"))
        baseSuggestion = " 88/min, regular, all peripheral pulses felt";
      else if (input.includes("bp"))
        baseSuggestion = " 130/80 mmHg in right arm supine position";
      else if (input.includes("chest"))
        baseSuggestion = " bilateral air entry normal, no added sounds";
    }
    // Logic for Treatment
    else if (field === "treatment") {
      if (input.includes("nebulization"))
        baseSuggestion = " with Duolin and Budecort every 6 hours";
      else if (input.includes("iv fluids"))
        baseSuggestion = " RL @ 100ml/hr for 24 hours";
    }
    // Logic for Advice
    else if (field === "advice") {
      if (input.includes("review"))
        baseSuggestion = " in Cardiology OPD after 7 days with follow-up ECG";
      else if (input.includes("avoid"))
        baseSuggestion =
          " strenuous physical activity and lifting heavy weights";
      else if (input.includes("salt"))
        baseSuggestion = " restricted diet (less than 5g per day)";
    }

    if (baseSuggestion) {
      // Prevent overlapping or appending if user already diverged or manually typed the suggestion
      const sigWord = baseSuggestion.trim().split(" ")[0];
      if (input.includes(sigWord)) {
        setActiveSuggestion(null);
        return;
      }

      const suggestionText = currentText.endsWith(" ")
        ? baseSuggestion.trim()
        : baseSuggestion;
      const full = currentText.endsWith(" ")
        ? currentText + baseSuggestion.trim()
        : currentText + baseSuggestion;

      setActiveSuggestion({
        field,
        index,
        text: suggestionText,
        fullText: full,
      });
    } else {
      setActiveSuggestion(null);
    }
  };

  const handleMedicineChange = (
    id: string,
    field: keyof Medicine,
    value: string,
  ) => {
    setSummary((prev) => ({
      ...prev,
      medicines: prev.medicines.map((m) =>
        m.id === id ? { ...m, [field]: value } : m,
      ),
    }));
  };

  const addMedicine = () => {
    const newMed: Medicine = {
      id: Date.now().toString(),
      name: "",
      frequency: "",
      duration: "",
    };
    setSummary((prev) => ({ ...prev, medicines: [...prev.medicines, newMed] }));
  };

  const removeMedicine = (id: string) => {
    setSummary((prev) => ({
      ...prev,
      medicines: prev.medicines.filter((m) => m.id !== id),
    }));
  };

  // Toast Helper
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // AI Assist (Legacy bulk generator)
  const handleSuggestDiagnosis = async () => {
    if (summary.complaints.length === 0)
      return alert("Please enter patient complaints first.");
    setAiLoading("diagnosis");
    try {
      const resp = await authenticatedFetch(
        `${API_BASE_URL}/api/recommendations/suggest`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cc: summary.complaints.join(", "),
            findings: summary.findings.join(", "),
            age: summary.age,
            gender: summary.sex,
          }),
        },
      );
      const data = await resp.json();
      if (data.success && data.suggestions.probable_diagnosis) {
        updateField("diagnosis", data.suggestions.probable_diagnosis);
      }
    } catch (e) {
      console.error("AI diagnosis error", e);
    } finally {
      setAiLoading(null);
    }
  };

  const handleImproveAdvice = async () => {
    if (summary.advice.length === 0)
      return alert("Please enter some advice points first.");
    setAiLoading("advice");
    setTimeout(() => {
      const suggestions = [
        "High protein, low salt diet recommended",
        "Strict bed rest for next 3 days",
        "Immediate ER visit if fever (>101°F) returns",
      ];
      setSummary((prev) => ({
        ...prev,
        advice: [...prev.advice, ...suggestions],
      }));
      setAiLoading(null);
      showToast("AI suggested 3 new advice points");
    }, 1500);
  };

  const handleSaveAndNext = () => {
    if (!activeSection) return;
    const currentIndex = SECTION_SEQUENCE.indexOf(activeSection);
    if (currentIndex !== -1 && currentIndex < SECTION_SEQUENCE.length - 1) {
      const nextSection = SECTION_SEQUENCE[currentIndex + 1];
      showToast(
        `${activeSection.charAt(0).toUpperCase() + activeSection.slice(1)} saved`,
      );
      setActiveSection(null); // First close
      setTimeout(() => setActiveSection(nextSection), 10); // Then open next to force re-render
    } else {
      showToast("All clinical sections completed");
      setActiveSection(null);
    }
  };

  const handlePreviousSection = () => {
    if (!activeSection) return;
    const currentIndex = SECTION_SEQUENCE.indexOf(activeSection);
    if (currentIndex > 0) {
      const prevSection = SECTION_SEQUENCE[currentIndex - 1];
      showToast(
        `${activeSection.charAt(0).toUpperCase() + activeSection.slice(1)} saved`,
      );
      setActiveSection(null);
      setTimeout(() => setActiveSection(prevSection), 10);
    }
  };

  const handleFinalSubmit = async () => {
    if (!summary.patientName) return alert("Patient Name is required");
    setIsSaving(true);
    try {
      let patientId: string | null = null;

      // --- PATIENT SYNC ENGINE ---
      if (clinic?.id) {
        let existingPatient = null;

        // 1. Lookup by phone (most reliable identifier)
        if (summary.phone) {
          const { data } = await supabase
            .from("patients")
            .select("*")
            .eq("contact", summary.phone)
            .eq("clinic_id", clinic.id)
            .maybeSingle();
          existingPatient = data;
        }

        // 2. Fallback to name match
        if (!existingPatient) {
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
            console.log(
              "[DS-EDITOR] Syncing patient demographics from discharge summary...",
            );
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
              contact: summary.phone || "0000000000",
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

      // --- DISCHARGE SUMMARY SAVE (with patient linkage) ---
      const { error } = await supabase.from("discharge_summaries").insert([
        {
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
          medicines: JSON.stringify(summary.medicines),
          advice: JSON.stringify(summary.advice),
          clinic_id: clinic?.id,
          patient_id: patientId,
        },
      ]);
      if (error) throw error;
      localStorage.removeItem("discharge_summary_draft");
      await alert("Discharge Summary finalized and linked to patient record!");
      window.print();

    } catch (e: any) {
      alert("Error saving: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    if (
      await confirm(
        "Are you sure you want to clear all records? This will delete the current draft.",
      )
    ) {
      setSummary({
        patientName: "",
        phone: "",
        age: "",
        sex: "Male",
        regNo: "",
        doa: "",
        dod: "",
        doctor: "",
        diagnosis: "",
        complaints: [],
        findings: [],
        treatment: [],
        advice: [],
        medicines: [],
      });
      localStorage.removeItem("discharge_summary_draft");
      setLastSaved(null);
      showToast("Records cleared");
    }
  };

  const getStatus = (val: any) => {
    if (!val) return styles.dotRed;
    if (Array.isArray(val)) {
      if (val.length === 0) return styles.dotRed;
      if (typeof val[0] === "string")
        return val.some((s) => s?.trim()) ? styles.dotGreen : styles.dotRed;
      if (typeof val[0] === "object")
        return val.some((m: any) => m.name?.trim())
          ? styles.dotGreen
          : styles.dotRed;
      return styles.dotGreen;
    }
    if (typeof val === "string")
      return val.trim() ? styles.dotGreen : styles.dotRed;
    return styles.dotGreen;
  };

  const renderClinicalCard = (
    title: string,
    subtitle: string,
    field: keyof SummaryData,
    icon: React.ReactNode,
    placeholder: string,
  ) => {
    const items = summary[field] as string[];
    const value = items.filter((s) => s.trim()).join(", ");
    return (
      <div
        className={styles.summaryCard}
        onClick={() => setActiveSection(field)}
        style={{ cursor: "pointer" }}
      >
        <div className={styles.cardHeader}>
          <div className={styles.cardTitleRow}>
            <div className={styles.cardTitle}>
              {icon}
              {title}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div className={`${styles.statusDot} ${getStatus(items)}`} />
              <button className={styles.btnEditMini}>Edit Details</button>
            </div>
          </div>
          <div className={styles.cardSubtitle}>{subtitle}</div>
        </div>
        <div className={styles.previewContent}>
          {value || (
            <span className={styles.emptyPlaceholder}>{placeholder}</span>
          )}
        </div>
      </div>
    );
  };

  const renderFocusEditor = () => {
    if (!activeSection) return null;
    const field = activeSection as keyof SummaryData;
    const items = summary[field] as string[];
    const label =
      activeSection.charAt(0).toUpperCase() + activeSection.slice(1);
    const isLastSection =
      SECTION_SEQUENCE.indexOf(activeSection) === SECTION_SEQUENCE.length - 1;

    return (
      <div className={styles.focusEditorOverlay}>
        <header className={styles.editorHeader}>
          <div style={{ display: "flex", alignItems: "center", flex: 1 }}>
            <button
              className={styles.btnBack}
              onClick={() => setActiveSection(null)}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              Exit
            </button>
            {autoSaveStatus !== "idle" && (
              <div
                className={`${styles.saveIndicator} ${styles[autoSaveStatus]}`}
              >
                <div className={styles.statusIndicatorDot} />
                {autoSaveStatus === "saving" ? "Saving..." : "Draft Saved"}
              </div>
            )}
          </div>
          <div className={styles.editorTitle}>Editing {label}</div>
          <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
            {field === "advice" && (
              <button
                className={styles.aiAssistBtn}
                onClick={handleImproveAdvice}
                disabled={!!aiLoading}
              >
                {aiLoading === "advice" ? "Refining..." : "AI Assist"}
              </button>
            )}
          </div>
        </header>

        <section className={styles.editorBody}>
          <div className={styles.editorContainer}>
            <div className={styles.editorCard}>
              <BulletListEditor
                field={field}
                items={items.length === 0 ? [""] : items}
                placeholder={`Enter patient ${activeSection} point...`}
                updateField={updateField}
                autoSaveStatus={autoSaveStatus}
                setAutoSaveStatus={setAutoSaveStatus}
                suggestTimer={suggestTimer}
                activeSuggestion={activeSuggestion}
                setActiveSuggestion={setActiveSuggestion}
                fetchSmartSuggestion={fetchSmartSuggestion}
              />
              <div
                className={styles.cardFooter}
                style={{
                  display: "flex",
                  justifyContent:
                    SECTION_SEQUENCE.indexOf(activeSection) > 0
                      ? "space-between"
                      : "flex-end",
                  width: "100%",
                }}
              >
                {SECTION_SEQUENCE.indexOf(activeSection) > 0 && (
                  <button
                    className="btn-secondary"
                    style={{
                      padding: "12px 18px",
                      fontSize: 13,
                      fontWeight: 700,
                      borderRadius: 12,
                    }}
                    onClick={handlePreviousSection}
                  >
                    ← Previous Section
                  </button>
                )}
                <button
                  className={styles.btnSaveBack}
                  onClick={handleSaveAndNext}
                >
                  {isLastSection
                    ? "Save & Finish Summary"
                    : `Save & Next Section`}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  };

  const renderMedicinesFocusEditor = () => {
    if (!isMedEditorOpen) return null;

    return (
      <div className={styles.focusEditorOverlay}>
        <header className={styles.editorHeader}>
          <div style={{ display: "flex", alignItems: "center", flex: 1 }}>
            <button
              className={styles.btnBack}
              onClick={() => setIsMedEditorOpen(false)}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              Close Editor
            </button>
            {autoSaveStatus !== "idle" && (
              <div
                className={`${styles.saveIndicator} ${styles[autoSaveStatus]}`}
              >
                <div className={styles.statusIndicatorDot} />
                {autoSaveStatus === "saving" ? "Saving..." : "Draft Saved"}
              </div>
            )}
          </div>
          <div className={styles.editorTitle}>Medications Manager</div>
          <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
            <button
              className={styles.aiAssistBtn}
              onClick={() => showToast("AI Dosage optimization coming soon...")}
            >
              Optimized Dosing
            </button>
          </div>
        </header>

        <section className={styles.editorBody}>
          <div className={styles.editorContainer} style={{ maxWidth: 1000 }}>
            <div className={styles.editorCard}>
              <div
                className={styles.medTableWrapper}
                style={{ border: "none", borderRadius: 0 }}
              >
                <table className={styles.medTable}>
                  <thead>
                    <tr>
                      <th style={{ width: 60 }}>SR.</th>
                      <th>Medicine / Formulation</th>
                      <th style={{ width: 180 }}>Frequency</th>
                      <th style={{ width: 140 }}>Duration</th>
                      <th style={{ width: 60 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.medicines.map((m, idx) => (
                      <tr key={m.id}>
                        <td
                          style={{
                            fontWeight: 800,
                            color: "var(--sanctuary- ink-l)",
                          }}
                        >
                          {String(idx + 1).padStart(2, "0")}
                        </td>
                        <td>
                          <input
                            className={styles.medInput}
                            style={{ fontSize: 16, fontWeight: 600 }}
                            value={m.name}
                            onChange={(e) =>
                              handleMedicineChange(m.id, "name", e.target.value)
                            }
                            placeholder="Type medicine name..."
                          />
                        </td>
                        <td>
                          <input
                            className={styles.medInput}
                            value={m.frequency}
                            onChange={(e) =>
                              handleMedicineChange(
                                m.id,
                                "frequency",
                                e.target.value,
                              )
                            }
                            placeholder="e.g. 1-0-1"
                          />
                        </td>
                        <td>
                          <input
                            className={styles.medInput}
                            value={m.duration}
                            onChange={(e) =>
                              handleMedicineChange(
                                m.id,
                                "duration",
                                e.target.value,
                              )
                            }
                            placeholder="5 days"
                          />
                        </td>
                        <td>
                          <button
                            className={styles.btnRemoveMed}
                            style={{ scale: "1.2" }}
                            onClick={() => removeMedicine(m.id)}
                          >
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {summary.medicines.length === 0 && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px 0",
                    color: "#94a3b8",
                    fontStyle: "italic",
                  }}
                >
                  No medications added yet. Start by clicking the button below.
                </div>
              )}

              <div
                className={styles.cardFooter}
                style={{
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <button
                  className={styles.btnAddMed}
                  style={{ margin: 0, width: "auto", padding: "12px 24px" }}
                  onClick={addMedicine}
                >
                  + Add New Medication
                </button>
                <button
                  className={styles.btnSaveBack}
                  onClick={() => setIsMedEditorOpen(false)}
                >
                  Complete Prescription
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  };

  if (clinicLoading) return null;

  return (
    <>
      {toast && (
        <div className={styles.toast} role="alert">
          {toast}
        </div>
      )}
      {activeSection && renderFocusEditor()}
      {isMedEditorOpen && renderMedicinesFocusEditor()}
      <div
        className={styles.page}
        style={{ display: activeSection || isMedEditorOpen ? "none" : "block" }}
      >
        <header className={styles.workspaceHeader}>
          <div className={styles.headerLeft}>
            <button
              className={styles.btnBack}
              onClick={() => {
                const docId = searchParams.get("doctorId");
                const docName = searchParams.get("doctorName");
                const href = `/portal/doctor-dashboard${docId ? `?doctorId=${docId}&doctorName=${encodeURIComponent(docName || "")}` : ""}`;
                router.push(href);
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              Back
            </button>
            <div className={styles.headerTitles}>
              <h1>Discharge Summary Builder</h1>
              <p>Create and manage patient discharge documentation</p>
            </div>
          </div>
          <div className={styles.headerRight}>
            <div className={styles.headerMeta}>
              <div className={styles.draftStatus}>
                <div className={`${styles.statusDot} ${lastSaved ? styles.dotGreen : styles.dotYellow}`} />
                {lastSaved ? "Draft Saved" : "Unsaved Changes"}
              </div>
              <div className={styles.lastSync}>
                Last sync: {lastSaved ? lastSaved.toLocaleTimeString() : "--"}
              </div>
            </div>
            <button
              className="btn-secondary"
              style={{ padding: "10px 20px", fontWeight: 700 }}
              onClick={() => {
                if (autoSaveStatus !== 'saved') {
                  saveDraft(summary);
                }
                showToast("Draft saved successfully");
              }}
            >
              Save Draft
            </button>
            <button
              className="btn-primary"
              style={{
                padding: "10px 24px",
                background: "var(--sanctuary-primary)",
                color: "#fff",
                fontWeight: 800
              }}
              onClick={() => setShowFullScreenPreview(true)}
            >
              Preview Discharge Summary
            </button>
          </div>
        </header>
        <main className={styles.main}>
          <div className={styles.layout}>
            <section className={styles.leftColumn}>
              <div className={styles.summaryCard}>
                <div className={styles.patientProfileHeader}>
                  <div className={styles.avatarPlaceholder}>
                    {summary.patientName ? summary.patientName.charAt(0).toUpperCase() : "P"}
                  </div>
                  <h2 className={styles.patientNameHeading}>
                    {summary.patientName || "New Patient"}
                  </h2>
                  <div className={styles.patientBadges}>
                    <span className={styles.badge} style={{ background: "var(--teal-l)", color: "var(--teal)" }}>
                      {summary.sex}
                    </span>
                    <span className={styles.badge} style={{ background: "var(--gold-l)", color: "var(--gold)" }}>
                      {summary.age ? `${summary.age} Years` : "Age -"}
                    </span>
                    <span className={styles.badge}>
                      IPD: {summary.regNo || "N/A"}
                    </span>
                  </div>
                </div>

                <div className={styles.cardHeader} style={{ border: 'none', padding: 0, marginBottom: 16 }}>
                  <div className={styles.cardTitle}>
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    Patient Information
                  </div>
                  <div
                    className={`${styles.statusDot} ${getStatus(summary.patientName)}`}
                  />
                </div>
                <div className="field">
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={summary.patientName}
                    onChange={(e) => updateField("patientName", e.target.value)}
                    placeholder="Amit Sharma"
                  />
                </div>
                <div className={styles.patientBrief}>
                  <div className={styles.briefItem}>
                    <div className="field" style={{ flex: 1 }}>
                      <label>Age</label>
                      <input
                        type="text"
                        value={summary.age}
                        onChange={(e) => updateField("age", e.target.value)}
                      />
                    </div>
                    <div className="field" style={{ flex: 1, marginLeft: 10 }}>
                      <label>Sex</label>
                      <select
                        value={summary.sex}
                        onChange={(e) => updateField("sex", e.target.value)}
                      >
                        <option>Male</option>
                        <option>Female</option>
                        <option>Other</option>
                      </select>
                    </div>
                  </div>
                  <div className="field">
                    <label>Phone Number (WhatsApp)</label>
                    <input
                      type="tel"
                      value={summary.phone || ""}
                      onChange={(e) => updateField("phone", e.target.value)}
                      placeholder="e.g. 9876543210"
                    />
                  </div>
                  <div className="field">
                    <label>Registration / IPD ID</label>
                    <input
                      type="text"
                      value={summary.regNo}
                      onChange={(e) => updateField("regNo", e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label>Adm. Date</label>
                    <input
                      type="datetime-local"
                      value={summary.doa}
                      onChange={(e) => updateField("doa", e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label>Dis. Date</label>
                    <input
                      type="datetime-local"
                      value={summary.dod}
                      onChange={(e) => updateField("dod", e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label>Admitting Doctor</label>
                    <select
                      value={summary.doctor}
                      onChange={(e) => updateField("doctor", e.target.value)}
                    >
                      <option value="">Select Doctor...</option>
                      {doctors?.map((d: any) => (
                        <option key={d.id} value={d.name}>
                          Dr. {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div
                className={styles.summaryCard}
                style={{ background: "var(--sanctuary-gray-low)" }}
              >
                <div
                  className={styles.cardTitle}
                  style={{ fontSize: 11, color: "var(--sanctuary-ink-l)" }}
                >
                  STATUS OVERVIEW
                </div>
                <div
                  style={{
                    marginTop: 12,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <div className={styles.briefItem}>
                    <label>Draft Status</label>{" "}
                    <span>{lastSaved ? "Saved Locally" : "Not Saved"}</span>
                  </div>
                  <div className={styles.briefItem}>
                    <label>Last Sync</label>{" "}
                    <span>
                      {lastSaved ? lastSaved.toLocaleTimeString() : "--"}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <section className={styles.centerColumn}>
              <div
                className={`${styles.summaryCard} ${styles.diagnosisHighlight}`}
              >
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitleRow}>
                    <div className={styles.cardTitle}>
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path d="m3 21 1.9-1.9A11.5 11.5 0 0 1 12 21a11.5 11.5 0 0 1 0-23 11.5 11.5 0 0 1 7.1 18.9l1.9 1.9" />
                      </svg>
                      Diagnosis
                    </div>
                  </div>
                  <div className={styles.cardSubtitle}>Record final diagnosis and primary conditions</div>
                </div>
                <input
                  className={styles.bulletInput}
                  value={summary.diagnosis}
                  onChange={(e) => updateField("diagnosis", e.target.value)}
                  placeholder="Final Clinical Diagnosis..."
                />
              </div>
              <div className={styles.clinicalSplit}>
                {renderClinicalCard(
                  "Complaints",
                  "Chief complaints & patient history",
                  "complaints",
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>,
                  "Add presenting complaints...",
                )}
                {renderClinicalCard(
                  "Findings",
                  "Physical findings & vitals",
                  "findings",
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>,
                  "Record examination findings...",
                )}
              </div>
              {renderClinicalCard(
                "Treatment Given",
                "Procedures and treatment provided",
                "treatment",
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>,
                "Add treatment details...",
              )}
              <div className={styles.summaryCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitleRow}>
                    <div className={styles.cardTitle}>
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path d="M10.5 3.5a2.121 2.121 0 0 1 3 3L7 13l-4 1 1-4 6.5-6.5z" />
                      </svg>
                      Medications{" "}
                      {summary.medicines.length > 7 && (
                        <span
                          style={{
                            fontSize: 11,
                            background: "var(--sanctuary-gray-low)",
                            padding: "2px 8px",
                            borderRadius: 10,
                            marginLeft: 8,
                          }}
                        >
                          {summary.medicines.length} ITEMS
                        </span>
                      )}
                    </div>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 12 }}
                    >
                      <div
                        className={`${styles.statusDot} ${getStatus(summary.medicines)}`}
                      />
                      <button
                        className={styles.btnEditMini}
                        onClick={() => setIsMedEditorOpen(true)}
                      >
                        Edit Full List
                      </button>
                    </div>
                  </div>
                  <div className={styles.cardSubtitle}>Prescribed medications upon discharge</div>
                </div>
                <div className={styles.medTableWrapper}>
                  <table className={styles.medTable}>
                    <thead>
                      <tr>
                        <th style={{ width: 40 }}>#</th>
                        <th>Medicine</th>
                        <th>Freq</th>
                        <th>Dur</th>
                        <th style={{ width: 40 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.medicines.slice(0, 7).map((m, idx) => (
                        <tr key={m.id}>
                          <td>{idx + 1}</td>
                          <td>
                            <input
                              className={styles.medInput}
                              value={m.name}
                              onChange={(e) =>
                                handleMedicineChange(
                                  m.id,
                                  "name",
                                  e.target.value,
                                )
                              }
                              placeholder="Medicine name..."
                            />
                          </td>
                          <td>
                            <input
                              className={styles.medInput}
                              value={m.frequency}
                              onChange={(e) =>
                                handleMedicineChange(
                                  m.id,
                                  "frequency",
                                  e.target.value,
                                )
                              }
                            />
                          </td>
                          <td>
                            <input
                              className={styles.medInput}
                              value={m.duration}
                              onChange={(e) =>
                                handleMedicineChange(
                                  m.id,
                                  "duration",
                                  e.target.value,
                                )
                              }
                            />
                          </td>
                          <td>
                            <button
                              className={styles.btnRemoveMed}
                              onClick={() => removeMedicine(m.id)}
                            >
                              ×
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {summary.medicines.length > 7 ? (
                  <button
                    className={styles.btnAddMed}
                    style={{
                      background: "var(--sanctuary-primary)",
                      color: "#fff",
                      border: "none",
                    }}
                    onClick={() => setIsMedEditorOpen(true)}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M12 5v14M5 12h14"></path>
                    </svg>
                    View / Add More Medicines ({summary.medicines.length - 7} more)
                  </button>
                ) : (
                  <button className={styles.btnAddMed} onClick={addMedicine}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M12 5v14M5 12h14"></path>
                    </svg>
                    Add Medication Item
                  </button>
                )}
              </div>
              {renderClinicalCard(
                "Advice & Follow-up",
                "Post-discharge instructions and follow-up plan",
                "advice",
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>,
                "Rest, diet, lifestyle changes...",
              )}
            </section>
          </div>
        </main>
        
      </div>
      
      {/* --- Full Screen Preview Modal --- */}
      {showFullScreenPreview && (
        <DischargeSummaryPreviewOverlay
          summary={summary}
          clinic={clinic}
          onClose={() => setShowFullScreenPreview(false)}
        />
      )}
    </>
  );
}

function DischargeSummaryPreviewOverlay({ summary, clinic, onClose }: { summary: SummaryData, clinic: any, onClose: () => void }) {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    try {
      setIsGeneratingPDF(true);
      const element = document.getElementById("discharge-summary-preview");
      if (!element) {
        setIsGeneratingPDF(false);
        return;
      }
      
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).default;

      // Use a scale of 2 for better resolution
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Discharge_Summary_${summary.patientName?.replace(/\s+/g, "_") || "Patient"}.pdf`);
    } catch (err) {
      console.error("Error generating PDF", err);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className={styles.fullScreenPreviewOverlay}>
      <header className={styles.previewTopBar}>
        <button className={styles.btnBack} onClick={onClose}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Back to Edit
        </button>
        <div className={styles.editorTitle}>Document Preview</div>
        <div className={styles.previewActions}>
          <button 
            className={styles.btnSave} 
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF}
          >
            {isGeneratingPDF ? "Generating PDF..." : "Download PDF"}
          </button>
          <button className={styles.btnPrint} onClick={handlePrint}>
            🖨️ Print
          </button>
        </div>
      </header>

      <div className={styles.previewDocWrapper}>
        <div id="discharge-summary-preview" className={styles.previewDoc}>
          <table className={styles.printableTable}>
            <thead>
              <tr>
                <td>
                  <div className={styles.previewHeader}>
                    <h2>{clinic?.name || "Clinic Name"}</h2>
                    <p>{clinic?.address || "Address details..."}</p>
                    <div
                      style={{
                        marginTop: 12,
                        fontSize: 15,
                        fontWeight: 900,
                        textDecoration: "underline",
                        letterSpacing: "1px",
                      }}
                    >
                      DISCHARGE SUMMARY
                    </div>
                  </div>

                  <div className={styles.previewInfoGrid}>
                    <div>
                      <b>Patient Name:</b>{" "}
                      {summary.patientName || (
                        <span className={styles.emptyPlaceholder}>
                          [Not Provided]
                        </span>
                      )}
                    </div>
                    <div>
                      <b>Reg / IPD No:</b> {summary.regNo || "---"}
                    </div>
                    <div>
                      <b>Age / Sex:</b> {summary.age}Y / {summary.sex}
                    </div>
                    <div>
                      <b>Consultant:</b> Dr. {summary.doctor || "---"}
                    </div>
                    <div>
                      <b>Date of Admission:</b>{" "}
                      {summary.doa
                        ? new Date(summary.doa).toLocaleString()
                        : "---"}
                    </div>
                    <div>
                      <b>Date of Discharge:</b>{" "}
                      {summary.dod
                        ? new Date(summary.dod).toLocaleString()
                        : "---"}
                    </div>
                  </div>
                </td>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td>
                  <div className={styles.previewSection}>
                    <h4>Final Diagnosis</h4>
                    <p>
                      {summary.diagnosis || (
                        <span className={styles.emptyPlaceholder}>
                          Pending diagnosis...
                        </span>
                      )}
                    </p>
                  </div>

                  <div className={styles.previewSection}>
                    <h4>Chief Complaints & History</h4>
                    {summary.complaints.length > 0 ? (
                      <ul
                        style={{ listStyle: "none", padding: 0, margin: 0 }}
                      >
                        {summary.complaints.map((c, i) => (
                          <li key={i} style={{ marginBottom: 6 }}>
                            • {c}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className={styles.emptyPlaceholder}>
                        No complaints recorded.
                      </p>
                    )}
                  </div>

                  <div className={styles.previewSection}>
                    <h4>Physical Findings & Investigations</h4>
                    {summary.findings.length > 0 ? (
                      <ul
                        style={{ listStyle: "none", padding: 0, margin: 0 }}
                      >
                        {summary.findings.map((f, i) => (
                          <li key={i} style={{ marginBottom: 6 }}>
                            • {f}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className={styles.emptyPlaceholder}>
                        No findings recorded.
                      </p>
                    )}
                  </div>

                  <div className={styles.previewSection}>
                    <h4>Treatment & Medications During Stay</h4>
                    {summary.treatment.length > 0 ? (
                      <ul
                        style={{ listStyle: "none", padding: 0, margin: 0 }}
                      >
                        {summary.treatment.map((t, i) => (
                          <li key={i} style={{ marginBottom: 6 }}>
                            • {t}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>Conservative management.</p>
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
                    <h4>Follow-up Advice & Instructions</h4>
                    {summary.advice.length > 0 ? (
                      <ul
                        style={{ listStyle: "none", padding: 0, margin: 0 }}
                      >
                        {summary.advice.map((a, i) => (
                          <li key={i} style={{ marginBottom: 6 }}>
                            • {a}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>General post-discharge care.</p>
                    )}
                  </div>
                </td>
              </tr>
            </tbody>

            <tfoot>
              <tr>
                <td>
                  <div
                    style={{
                      paddingTop: 60,
                      textAlign: "right",
                      borderTop: "1px solid #000",
                      marginTop: 40,
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
      </div>
    </div>
  );
}

export default function DischargeSummaryPage() {
  return (
    <Suspense fallback={<div>Loading Discharge Summary...</div>}>
      <DischargeSummaryRedesign />
    </Suspense>
  );
}
