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
  dischargeCondition: string[];
  advice: string[];
  medicines: Medicine[];
}

interface Suggestion {
  field: string;
  index: number;
  text: string;
  fullText: string;
}

const SECTION_SEQUENCE = ["complaints", "findings", "treatment", "dischargeCondition", "advice"];

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
    dischargeCondition: [],
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
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
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
          dischargeCondition: migrate(draft.dischargeCondition),
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
    // Logic for Discharge Condition
    else if (field === "dischargeCondition") {
      if (input.includes("stable"))
        baseSuggestion = " hemodynamically stable, conscious and oriented";
      else if (input.includes("wound"))
        baseSuggestion = " clean and dry, healing well";
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
          discharge_condition: JSON.stringify(summary.dischargeCondition),
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
        dischargeCondition: [],
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
          <div className={styles.cardTitle}>
            {icon}
            {title}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className={`${styles.statusDot} ${getStatus(items)}`} />
            <button className={styles.btnEditMini}>Edit</button>
          </div>
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
        <TopBar
          title="Discharge Summary Editor"
          backHref={`/demo/portal/doctor-dashboard${
            searchParams.get("doctorId")
              ? `?doctorId=${searchParams.get("doctorId")}&doctorName=${encodeURIComponent(
                  searchParams.get("doctorName") || ""
                )}`
              : ""
          }`}
        />
        
        <div className={styles.stickyPatientHeader}>
          <div className={styles.stickyPatientInner}>
            <div className={styles.stickyPatientPill}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
              <span>{summary.patientName || "Unknown Patient"}</span>
            </div>
            <div className={styles.stickyPatientChip}>
              <span className={styles.stickyChipLabel}>AGE</span>
              <span>{summary.age || "--"} / {summary.sex || "--"}</span>
            </div>
            {summary.doctor && (
              <div className={styles.stickyPatientChip}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
                <span>Dr. {summary.doctor}</span>
              </div>
            )}
          </div>
        </div>

        <main className={styles.main}>
          <header className={styles.pageHeader}>
            <div className={styles.headerTitle}>
              <h1>Discharge Summary</h1>
              <p>Create, review, and finalize the patient's discharge documentation.</p>
            </div>
            <div className={styles.headerActions}>
              <button className={styles.btnDraft} onClick={() => { saveDraft(summary); showToast("Draft Saved Successfully"); }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                Save Draft
              </button>
              <button className={styles.btnPreview} onClick={() => router.push("/demo/portal/discharge-summary/view")}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" /></svg>
                Preview Summary
              </button>
              <button className={styles.btnDraft} onClick={handleClear} style={{ color: "#ef4444", gap: "6px" }}>
                Clear
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          </header>

          <div className={styles.patientContextCard}>
            <div className={styles.patientIconWrapper}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
            </div>
            <div className={styles.contextGrid}>
              <div className={styles.contextItem}>
                <span className={styles.contextLabel}>Patient Name</span>
                <span className={styles.contextValue}>{summary.patientName || "—"}</span>
              </div>
              <div className={styles.contextItem}>
                <span className={styles.contextLabel}>UHID / IPD No.</span>
                <span className={styles.contextValue}>{summary.regNo || "—"}</span>
              </div>
              <div className={styles.contextItem}>
                <span className={styles.contextLabel}>Age / Gender</span>
                <span className={styles.contextValue}>{summary.age || "--"} / {summary.sex || "--"}</span>
              </div>
              <div className={styles.contextItem}>
                <span className={styles.contextLabel}>Admission Date</span>
                <span className={styles.contextValue}>
                  {summary.doa ? new Date(summary.doa).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' }) : "—"}
                </span>
              </div>
              <div className={styles.contextItem}>
                <span className={styles.contextLabel}>Discharge Date</span>
                <span className={styles.contextValue}>
                  {summary.dod ? new Date(summary.dod).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' }) : "—"}
                  {summary.dod && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" style={{ marginLeft: 4 }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
                </span>
              </div>
              <div className={styles.contextItem}>
                <span className={styles.contextLabel}>Treating Doctor</span>
                <span className={styles.contextValue} style={{ color: "#7c3aed" }}>{summary.doctor ? `Dr. ${summary.doctor}` : "—"}</span>
              </div>
              <div className={styles.contextItem}>
                <span className={styles.contextLabel}>Ward / Room</span>
                <span className={styles.contextValue}>General / 205</span>
              </div>
              <div className={styles.contextItem}>
                <span className={styles.contextLabel}>Status</span>
                <span className={styles.statusBadge}>Admitted</span>
              </div>
            </div>
          </div>

          <div className={styles.sectionRow} onClick={() => setActiveSection("diagnosis")}>
            <div className={styles.sectionLeft}>
              <div className={styles.sectionIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
              </div>
              <span className={styles.sectionTitle}>Diagnosis</span>
              <span className={`${styles.sectionContent} ${summary.diagnosis ? styles.hasData : ""}`}>
                {summary.diagnosis || "Enter final diagnosis and primary conditions"}
              </span>
            </div>
            <button className={styles.sectionAction} onClick={(e) => { e.stopPropagation(); setActiveSection("diagnosis"); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
              Edit
            </button>
          </div>

          <div className={styles.sectionRow} onClick={() => setActiveSection("complaints")}>
            <div className={styles.sectionLeft}>
              <div className={styles.sectionIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              </div>
              <span className={styles.sectionTitle}>Complaints</span>
              <span className={`${styles.sectionContent} ${summary.complaints.join("") ? styles.hasData : ""}`}>
                {summary.complaints.join(", ") || "Enter chief complaints and relevant patient history"}
              </span>
            </div>
            <button className={styles.sectionAction} onClick={(e) => { e.stopPropagation(); setActiveSection("complaints"); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
              Edit
            </button>
          </div>

          <div className={styles.sectionRow} onClick={() => setActiveSection("findings")}>
            <div className={styles.sectionLeft}>
              <div className={styles.sectionIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </div>
              <span className={styles.sectionTitle}>Findings</span>
              <span className={`${styles.sectionContent} ${summary.findings.join("") ? styles.hasData : ""}`}>
                {summary.findings.join(", ") || "Enter physical findings, examination results and vitals"}
              </span>
            </div>
            <button className={styles.sectionAction} onClick={(e) => { e.stopPropagation(); setActiveSection("findings"); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
              Edit
            </button>
          </div>

          <div className={styles.sectionRow} onClick={() => setActiveSection("treatment")}>
            <div className={styles.sectionLeft}>
              <div className={styles.sectionIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
              </div>
              <span className={styles.sectionTitle}>Treatment Given</span>
              <span className={`${styles.sectionContent} ${summary.treatment.join("") ? styles.hasData : ""}`}>
                {summary.treatment.join(", ") || "Enter procedures and treatment provided during stay"}
              </span>
            </div>
            <button className={styles.sectionAction} onClick={(e) => { e.stopPropagation(); setActiveSection("treatment"); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
              Edit
            </button>
          </div>

          <div className={styles.sectionRow} onClick={() => setIsMedEditorOpen(true)}>
            <div className={styles.sectionLeft}>
              <div className={styles.sectionIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.5 3.5a2.121 2.121 0 0 1 3 3L7 13l-4 1 1-4 6.5-6.5z" /></svg>
              </div>
              <span className={styles.sectionTitle}>Medications</span>
              <span className={`${styles.sectionContent} ${summary.medicines.length > 0 ? styles.hasData : ""}`}>
                {summary.medicines.length > 0 ? summary.medicines.map((m: any) => m.name).join(", ") : "Enter discharge medications"}
              </span>
            </div>
            <button className={styles.sectionAction} onClick={(e) => { e.stopPropagation(); setIsMedEditorOpen(true); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
              Edit Full List
            </button>
          </div>

          <div className={styles.sectionRow} onClick={() => setActiveSection("dischargeCondition")}>
            <div className={styles.sectionLeft}>
              <div className={styles.sectionIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              </div>
              <span className={styles.sectionTitle}>Condition at Discharge</span>
              <span className={`${styles.sectionContent} ${summary.dischargeCondition.join("") ? styles.hasData : ""}`}>
                {summary.dischargeCondition.join(", ") || "Enter vitals, general condition at discharge"}
              </span>
            </div>
            <button className={styles.sectionAction} onClick={(e) => { e.stopPropagation(); setActiveSection("dischargeCondition"); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
              Edit
            </button>
          </div>

          <div className={styles.sectionRow} onClick={() => setActiveSection("advice")}>
            <div className={styles.sectionLeft}>
              <div className={styles.sectionIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              </div>
              <span className={styles.sectionTitle}>Advice & Follow-up</span>
              <span className={`${styles.sectionContent} ${summary.advice.join("") ? styles.hasData : ""}`}>
                {summary.advice.join(", ") || "Enter post-discharge instructions and follow-up plan"}
              </span>
            </div>
            <button className={styles.sectionAction} onClick={(e) => { e.stopPropagation(); setActiveSection("advice"); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
              Edit
            </button>
          </div>

          <div className={styles.infoBanner}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            Click Preview Summary to review the printable discharge summary.
          </div>
        </main>
      </div>
    </>
  );
}

export default function DischargeSummaryPage() {
  return (
    <Suspense fallback={<div>Loading Discharge Summary...</div>}>
      <DischargeSummaryRedesign />
    </Suspense>
  );
}
