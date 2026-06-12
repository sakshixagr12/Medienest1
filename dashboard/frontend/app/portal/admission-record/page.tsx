"use client";

import React, { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TopBar from "@/components/TopBar";
import { useClinic } from "@/context/ClinicContext";
import { createClient } from "@/lib/supabase/client";
import { API_BASE_URL, authenticatedFetch } from "@/lib/api";
import styles from "./page.module.css";

// Types
interface Investigation {
  name: string;
  status: "Pending" | "Completed";
}

interface SummaryData {
  patientName: string;
  phone: string;
  age: string;
  sex: string;
  doctor: string;
  ward: string;
  bed: string;
  department: string;
  date_admission: string;
  severity: string;
  admission_type: string;
  has_diabetes: boolean;
  has_hypertension: boolean;
  has_thyroid: boolean;
  past_surgeries: string;
  allergies: string;
  doctor_observations: string;
  attachments: { name: string; url: string; type: string; size: number }[];
  vitals: string; // Keep for legacy / fallback
  vitals_bp_sys: string;
  vitals_bp_dia: string;
  vitals_pulse: string;
  vitals_temp: string;
  vitals_spo2: string;
  complaints: string[];
  hpi: string;
  findings: string[];
  diagnosis: string;
  final_diagnosis: string;
  investigations: Investigation[];
  treatment_plan: string[];
}

interface Suggestion {
  field: string;
  index: number;
  text: string;
  fullText: string;
}

const SECTION_SEQUENCE = [
  "complaints",
  "findings",
  "investigations",
  "treatment_plan",
];

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

const ChipInputEditor = ({ items, updateField, field, placeholder }: any) => {
  const [inputValue, setInputValue] = useState("");

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      if (!items.includes(inputValue.trim())) {
        updateField(field, [...items, inputValue.trim()]);
      }
      setInputValue("");
    } else if (e.key === "Backspace" && !inputValue && items.length > 0) {
      updateField(field, items.slice(0, -1));
    }
  };

  const removeChip = (idx: number) => {
    const next = [...items];
    next.splice(idx, 1);
    updateField(field, next);
  };

  return (
    <div
      className={styles.bulletListContainer}
      style={{
        background: "#fff",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "12px 16px",
      }}
    >
      <div className={styles.chipGroup}>
        {items.map((item: string, idx: number) => (
          <div key={idx} className={styles.chip}>
            {item}
            <button
              className={styles.chipRemove}
              onClick={() => removeChip(idx)}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        ))}
        <input
          className={styles.chipInput}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={items.length === 0 ? placeholder : "Add more..."}
        />
      </div>
      <div
        style={{
          fontSize: 10,
          color: "#94a3b8",
          marginTop: 12,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        Press ENTER to add tag • BACKSPACE to remove
      </div>
    </div>
  );
};

const InvestigationEditor = ({ items, updateField, field }: any) => {
  const COMMON_TESTS = [
    "CBC",
    "LFT",
    "KFT",
    "Lipid Profile",
    "Thyroid Profile",
    "HbA1c",
    "Urine Routine",
    "X-ray Chest",
    "USG Abdomen",
    "CT Scan",
    "ECG",
    "ECHO",
  ];
  const [selected, setSelected] = useState("");

  const addTest = (name: string) => {
    if (!name) return;
    updateField(field, [...items, { name, status: "Pending" }]);
    setSelected("");
  };

  const toggleStatus = (idx: number) => {
    const next = [...items];
    next[idx].status = next[idx].status === "Pending" ? "Completed" : "Pending";
    updateField(field, next);
  };

  const removeTest = (idx: number) => {
    const next = [...items];
    next.splice(idx, 1);
    updateField(field, next);
  };

  return (
    <div
      className={styles.bulletListContainer}
      style={{
        background: "#fff",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "24px",
      }}
    >
      <div className={styles.testList}>
        {items.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "20px",
              color: "#94a3b8",
              fontSize: 13,
            }}
          >
            No investigations added yet.
          </div>
        ) : (
          items.map((test: Investigation, idx: number) => (
            <div key={idx} className={styles.testRow}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>
                  {test.name}
                </span>
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <button
                  className={`${styles.statusBadge} ${test.status === "Pending" ? styles.statusPending : styles.statusCompleted}`}
                  onClick={() => toggleStatus(idx)}
                >
                  {test.status}
                </button>
                <button
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#ef4444",
                    cursor: "pointer",
                  }}
                  onClick={() => removeTest(idx)}
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
            </div>
          ))
        )}
      </div>

      <div className={styles.testSelector}>
        <select
          className={styles.investigDropDown}
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="">+ Quick Add Test...</option>
          {COMMON_TESTS.filter(
            (t) => !items.find((it: any) => it.name === t),
          ).map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
          <option value="CUSTOM">OTHER (Manual Entry)</option>
        </select>
        <button
          className={styles.btnSaveBack}
          style={{ width: "auto", padding: "0 20px" }}
          onClick={() => addTest(selected)}
        >
          Add Test
        </button>
      </div>

      {selected === "CUSTOM" && (
        <div style={{ marginTop: 12 }}>
          <input
            className={styles.bulletInput}
            placeholder="Type custom investigation name..."
            onKeyDown={(e) => {
              if (e.key === "Enter")
                addTest((e.target as HTMLInputElement).value);
            }}
          />
        </div>
      )}
    </div>
  );
};

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

    if (autoSaveStatus !== "idle") setAutoSaveStatus("idle");

    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    suggestTimer.current = setTimeout(() => {
      fetchSmartSuggestion(field, index, val);
    }, 300);
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

function AdmissionRecordRedesign() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const docNameParam = searchParams.get("docName");
  const { clinic, doctors, loading: isClinicLoading } = useClinic();
  const supabase = createClient();

  const [summary, setSummary] = useState<SummaryData>({
    patientName: "",
    phone: "",
    age: "",
    sex: "Male",
    doctor: "",
    ward: "",
    bed: "",
    department: "",
    date_admission: new Date().toISOString().slice(0, 16),
    severity: "Mild",
    admission_type: "OPD",
    has_diabetes: false,
    has_hypertension: false,
    has_thyroid: false,
    past_surgeries: "",
    allergies: "",
    doctor_observations: "",
    attachments: [],
    vitals: "",
    vitals_bp_sys: "",
    vitals_bp_dia: "",
    vitals_pulse: "",
    vitals_temp: "",
    vitals_spo2: "",
    diagnosis: "",
    final_diagnosis: "",
    hpi: "",
    complaints: [],
    findings: [],
    investigations: [],
    treatment_plan: [],
  });

  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [clinicLoading, setClinicLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [isQuickMode, setIsQuickMode] = useState(false);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [activeSuggestion, setActiveSuggestion] = useState<Suggestion | null>(
    null,
  );
  const [autoSaveStatus, setAutoSaveStatus] = useState<
    "idle" | "saving" | "saved"
  >("idle");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    hpi: false,
    investigations: false,
    treatment_plan: false,
  });
  const [uploadProgress, setUploadProgress] = useState<{
    [key: string]: number;
  }>({});
  const [toast, setToast] = useState<string | null>(null);
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);

  const suggestTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const draftStr = localStorage.getItem("admission_draft");
    if (draftStr) {
      try {
        const draft = JSON.parse(draftStr);
        // Merge with initial state to avoid 'undefined' fields for older drafts
        setSummary((prev) => ({
          ...prev,
          ...draft,
          // Explicitly handle fields that might be missing in older drafts
          ward: draft.ward || "",
          bed: draft.bed || "",
          department: draft.department || "",
          diagnosis: draft.diagnosis || "",
          hpi: draft.hpi || "",
          has_diabetes: !!draft.has_diabetes,
          has_hypertension: !!draft.has_hypertension,
          has_thyroid: !!draft.has_thyroid,
          past_surgeries: draft.past_surgeries || "",
          allergies: draft.allergies || "",
          severity: draft.severity || "Mild",
          admission_type: draft.admission_type || "OPD",
          doctor_observations: draft.doctor_observations || "",
          attachments: draft.attachments || [],
          vitals: draft.vitals || "",
          vitals_bp_sys: draft.vitals_bp_sys || "",
          vitals_bp_dia: draft.vitals_bp_dia || "",
          vitals_pulse: draft.vitals_pulse || "",
          vitals_temp: draft.vitals_temp || "",
          final_diagnosis: draft.final_diagnosis || "",
          investigations: Array.isArray(draft.investigations)
            ? draft.investigations.map((inv: any) =>
                typeof inv === "string"
                  ? { name: inv, status: "Pending" }
                  : inv,
              )
            : [],
        }));
      } catch (e) {
        console.error("Failed to parse draft", e);
      }
    } else {
      if (docNameParam) {
        setSummary((prev) => ({ ...prev, doctor: docNameParam }));
      } else if (doctors && doctors.length > 0) {
        setSummary((prev) => ({ ...prev, doctor: doctors[0].name }));
      }
    }
    setClinicLoading(false);
  }, [docNameParam, doctors]);

  const saveDraft = useCallback((data: SummaryData) => {
    try {
      // Basic circular structure protection and logging for debugging
      const cleanData = JSON.parse(
        JSON.stringify(data, (key, value) => {
          if (
            value instanceof HTMLElement ||
            (value &&
              value.constructor &&
              value.constructor.name === "HTMLInputElement")
          ) {
            console.warn(
              `Circular structure detected in field: ${key}. Stripping element from state.`,
            );
            return undefined;
          }
          return value;
        }),
      );
      localStorage.setItem("admission_draft", JSON.stringify(cleanData));
      setLastSaved(new Date());
      setAutoSaveStatus("saved");
      setTimeout(() => setAutoSaveStatus("idle"), 2000);
    } catch (err) {
      console.error("Final safety check failed for draft save:", err);
    }
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

  const fetchSmartSuggestion = async (
    field: string,
    index: number,
    currentText: string,
  ) => {
    if (!currentText || currentText.trim().split(" ").length < 2) {
      setActiveSuggestion(null);
      return;
    }
    const input = currentText.toLowerCase();
    let baseSuggestion = "";

    if (field === "complaints") {
      if (input.includes("fever"))
        baseSuggestion = " associated with chills and rigor";
      else if (input.includes("chest pain"))
        baseSuggestion = " radiating to left arm with breathlessness";
      else if (input.includes("abdominal pain"))
        baseSuggestion = " associated with nausea and vomiting";
      else if (input.includes("headache"))
        baseSuggestion = " thumping type associated with photophobia";
      else if (input.includes("breathless"))
        baseSuggestion = " on exertion associated with orthopnea";
    } else if (field === "investigations") {
      if (input.includes("cbc"))
        baseSuggestion = " and LFT, KFT, Serum Electrolytes";
      else if (input.includes("xray")) baseSuggestion = " chest PA view";
      else if (input.includes("ct scan"))
        baseSuggestion = " abdomen and pelvis with contrast";
      else if (input.includes("usg"))
        baseSuggestion = " whole abdomen for internal pathology";
      else if (input.includes("ecg"))
        baseSuggestion = " 12 lead for cardiac evaluation";
    } else if (field === "treatment_plan") {
      if (input.includes("iv")) baseSuggestion = " Fluids (NS/RL) 100ml/hr";
      else if (input.includes("inj")) baseSuggestion = " Pantop 40mg IV OD";
      else if (input.includes("antibiotic"))
        baseSuggestion = " coverage as per hospital protocol";
      else if (input.includes("tab"))
        baseSuggestion = " PCM 650mg SOS for fever";
    }

    if (baseSuggestion) {
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

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 10 * 1024 * 1024) {
        alert(`File ${file.name} is too large. Max 10MB.`);
        continue;
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}-${Date.now()}.${fileExt}`;
      const filePath = `${clinic?.id}/${fileName}`;

      setUploadProgress((prev) => ({ ...prev, [file.name]: 10 }));

      const { data, error } = await supabase.storage
        .from("medical-records")
        .upload(filePath, file, { cacheControl: "3600", upsert: false });

      if (error) {
        console.error("Upload error:", error);
        showToast(`Failed to upload ${file.name}`);
        setUploadProgress((prev) => {
          const next = { ...prev };
          delete next[file.name];
          return next;
        });
        continue;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("medical-records").getPublicUrl(filePath);

      setSummary((prev) => ({
        ...prev,
        attachments: [
          ...prev.attachments,
          {
            name: file.name,
            url: publicUrl,
            type: file.type,
            size: file.size,
          },
        ],
      }));

      setUploadProgress((prev) => {
        const next = { ...prev };
        delete next[file.name];
        return next;
      });
      showToast(`${file.name} attached`);
    }
  };

  const handleDeleteAttachment = async (index: number) => {
    if (!(await confirm("Remove this attachment?"))) return;
    const item = summary.attachments[index];

    // Attempt to extract path from URL
    try {
      const path = item.url.split("public/medical-records/")[1];
      if (path) {
        await supabase.storage.from("medical-records").remove([path]);
      }
    } catch (e) {
      console.error("Delete storage error", e);
    }

    const newAttachments = [...summary.attachments];
    newAttachments.splice(index, 1);
    updateField("attachments", newAttachments);
    showToast("Attachment removed");
  };

  const calculateProgress = () => {
    let required = ["patientName", "doctor", "ward", "bed"];
    let clinical = [
      "complaints",
      "findings",
      "diagnosis",
      "vitals_pulse",
      "vitals_bp_sys",
    ];

    if (isQuickMode) {
      // In quick mode, only Name, Complaint and Vitals are strictly required
      required = ["patientName"];
      clinical = ["complaints", "vitals_pulse"];
    }

    const all = [...required, ...clinical];
    let completed = 0;
    const missing: string[] = [];

    all.forEach((f) => {
      const val = summary[f as keyof SummaryData];
      const isFilled = Array.isArray(val) ? val.length > 0 : !!val;

      if (isFilled) {
        completed++;
      } else {
        const label = f
          .replace(/vitals_/, "")
          .replace(/_/g, " ")
          .replace(/([A-Z])/g, " $1")
          .replace(/^./, (str) => str.toUpperCase());
        missing.push(label);
      }
    });

    const percentage =
      all.length > 0 ? Math.round((completed / all.length) * 100) : 0;
    return { percentage, missing };
  };

  const handleFinalSubmit = async () => {
    if (!summary.patientName) return alert("Patient Name is required");

    const { percentage } = calculateProgress();
    if (percentage < 100) {
      if (
        !(await confirm(
          `This record is only ${percentage}% clinically complete. Are you sure you want to submit?`,
        ))
      ) {
        return;
      }
    }

    setIsSaving(true);
    try {
      let patientId: string | null = null;
      if (clinic?.id) {
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
          const newAge = parseInt(summary.age);
          if (
            (newAge && existingPatient.age !== newAge) ||
            (summary.sex && existingPatient.gender !== summary.sex) ||
            (summary.phone && existingPatient.contact !== summary.phone) ||
            existingPatient.has_diabetes !== summary.has_diabetes ||
            existingPatient.has_hypertension !== summary.has_hypertension ||
            existingPatient.has_thyroid !== summary.has_thyroid ||
            (summary.allergies &&
              existingPatient.allergies !== summary.allergies) ||
            (summary.past_surgeries &&
              existingPatient.past_surgeries !== summary.past_surgeries)
          ) {
            await supabase
              .from("patients")
              .update({
                age: newAge || existingPatient.age,
                gender: summary.sex || existingPatient.gender,
                contact: summary.phone || existingPatient.contact,
                has_diabetes: summary.has_diabetes,
                has_hypertension: summary.has_hypertension,
                has_thyroid: summary.has_thyroid,
                allergies: summary.allergies || existingPatient.allergies,
                past_surgeries:
                  summary.past_surgeries || existingPatient.past_surgeries,
              })
              .eq("id", patientId);
          }
        } else {
          const { data: newPatient } = await supabase
            .from("patients")
            .insert({
              name: summary.patientName,
              contact: summary.phone || "0000000000",
              age: parseInt(summary.age) || null,
              gender: summary.sex,
              clinic_id: clinic.id,
              has_diabetes: summary.has_diabetes,
              has_hypertension: summary.has_hypertension,
              has_thyroid: summary.has_thyroid,
              allergies: summary.allergies,
              past_surgeries: summary.past_surgeries,
            })
            .select("id")
            .single();
          if (newPatient?.id) patientId = newPatient.id;
        }
      }

      const { error } = await supabase.from("admission_records").insert([
        {
          patient_name: summary.patientName,
          age_sex: `${summary.age} / ${summary.sex}`,
          contact: summary.phone,
          doctor_name: summary.doctor,
          ward: summary.ward,
          bed: summary.bed,
          department: summary.department,
          date_admission: summary.date_admission,
          severity: summary.severity,
          admission_type: summary.admission_type,
          doctor_observations: summary.doctor_observations,
          attachments: summary.attachments,
          vitals: summary.vitals,
          vitals_bp_sys: summary.vitals_bp_sys
            ? parseInt(summary.vitals_bp_sys)
            : null,
          vitals_bp_dia: summary.vitals_bp_dia
            ? parseInt(summary.vitals_bp_dia)
            : null,
          vitals_pulse: summary.vitals_pulse
            ? parseInt(summary.vitals_pulse)
            : null,
          vitals_temp: summary.vitals_temp
            ? parseFloat(summary.vitals_temp)
            : null,
          vitals_spo2: summary.vitals_spo2
            ? parseInt(summary.vitals_spo2)
            : null,
          has_diabetes: summary.has_diabetes,
          has_hypertension: summary.has_hypertension,
          has_thyroid: summary.has_thyroid,
          past_surgeries: summary.past_surgeries,
          allergies: summary.allergies,
          diagnosis: summary.diagnosis,
          final_diagnosis: summary.final_diagnosis,
          hpi: summary.hpi,
          complaints: summary.complaints,
          findings: summary.findings,
          investigations: summary.investigations,
          treatment_plan: summary.treatment_plan,
          clinic_id: clinic?.id,
          patient_id: patientId,
        },
      ]);
      if (error) throw error;
      localStorage.removeItem("admission_draft");
      await alert("Admission Record finalized and linked to patient!");
      const params = new URLSearchParams();

      const dId = searchParams.get("doctorId");
      const dName = searchParams.get("doctorName") || searchParams.get("docName");
      if (dId) params.set("doctorId", dId);
      if (dName) params.set("doctorName", dName);
      const qs = params.toString();
      if (patientId) {
        router.push(`/portal/doctor-dashboard/patients/${patientId}${qs ? `?${qs}` : ""}`);
      } else {
        router.push(`/portal/doctor-dashboard${qs ? `?${qs}` : ""}`);
      }
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
        doctor: "",
        ward: "",
        bed: "",
        department: "",
        date_admission: new Date().toISOString().slice(0, 16),
        severity: "Mild",
        admission_type: "OPD",
        has_diabetes: false,
        has_hypertension: false,
        has_thyroid: false,
        past_surgeries: "",
        allergies: "",
        doctor_observations: "",
        attachments: [],
        vitals: "",
        vitals_bp_sys: "",
        vitals_bp_dia: "",
        vitals_pulse: "",
        vitals_temp: "",
        vitals_spo2: "",
        diagnosis: "",
        final_diagnosis: "",
        hpi: "",
        complaints: [],
        findings: [],
        investigations: [],
        treatment_plan: [],
      });
      localStorage.removeItem("admission_draft");
      setLastSaved(null);
      showToast("Records cleared");
    }
  };

  const getStatus = (val: any) => {
    if (!val) return styles.dotRed;
    if (Array.isArray(val)) {
      return val.some((s) => {
        if (typeof s === "string") return s.trim();
        if (typeof s === "object" && s !== null) return s.name?.trim();
        return false;
      })
        ? styles.dotGreen
        : styles.dotRed;
    }
    if (typeof val === "string")
      return val.trim() ? styles.dotGreen : styles.dotRed;
    return styles.dotGreen;
  };

  const getVitalsAlerts = (data: SummaryData) => {
    const alerts = [];
    if (data.vitals_temp && parseFloat(data.vitals_temp) > 101) {
      alerts.push({
        type: "warning",
        label: `️ High Fever detected (${data.vitals_temp}°F)`,
      });
    }
    if (data.vitals_pulse && parseInt(data.vitals_pulse) > 100) {
      alerts.push({
        type: "warning",
        label: `️ Tachycardia detected (Pulse: ${data.vitals_pulse} BPM)`,
      });
    }
    if (data.vitals_spo2 && parseInt(data.vitals_spo2) < 94) {
      alerts.push({
        type: "critical",
        label: `Critical Low SpO2 (${data.vitals_spo2}%)`,
      });
    }
    return alerts;
  };

  const renderWizardProgress = () => {
    const steps = [
      {
        id: 1,
        label: "Patient & Admission",
        icon: (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          >
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        ),
      },
      {
        id: 2,
        label: "Clinical Information",
        icon: (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          >
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        ),
      },
      {
        id: 3,
        label: "Management Plan",
        icon: (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          >
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
        ),
      },
    ];

    return (
      <div className={styles.wizardProgress}>
        <div className={styles.wizardProgressInner}>
          {isQuickMode ? (
            <div className={styles.quickModeIndicator}>
              <div className={styles.emergencyPulse} />
              <div className={styles.wizardStepLabel}>
                <small>Mode Active</small>
                <span style={{ color: "#ef4444" }}>
                  Quick Emergency Admission
                </span>
              </div>
              <button
                className={styles.btnExitQuick}
                onClick={() => setIsQuickMode(false)}
              >
                Exit Quick Mode
              </button>
            </div>
          ) : (
            steps.map((s, idx) => (
              <React.Fragment key={s.id}>
                <div
                  className={`${styles.wizardStep} ${step === s.id ? styles.wizardStepActive : step > s.id ? styles.wizardStepCompleted : ""}`}
                  onClick={() => step > s.id && setStep(s.id)}
                  style={{ cursor: step > s.id ? "pointer" : "default" }}
                >
                  <div className={styles.wizardStepIcon}>{s.icon}</div>
                  <div className={styles.wizardStepLabel}>
                    <small>Step {s.id} of 3</small>
                    <span>{s.label}</span>
                  </div>
                </div>
                {idx < steps.length - 1 && (
                  <div className={styles.wizardStepDivider} />
                )}
              </React.Fragment>
            ))
          )}
        </div>
        {!isQuickMode && (
          <button
            className={styles.btnEnterQuick}
            onClick={() => setIsQuickMode(true)}
          >
            Quick Admission
          </button>
        )}
      </div>
    );
  };

  const renderClinicalCard = (
    title: string,
    field: keyof SummaryData,
    icon: React.ReactNode,
    placeholder: string,
  ) => {
    const items = summary[field] as any[];
    const isCollapsible = ["investigations", "treatment_plan"].includes(
      field as string,
    );
    const isCollapsed = collapsed[field as string];

    return (
      <div
        className={`${styles.summaryCard} ${styles.inlineEditCard}`}
        style={{ cursor: "default" }}
      >
        <div className={styles.cardHeader}>
          <div className={styles.cardTitle}>
            {icon}
            {title}
            {(!items ||
              items.length === 0 ||
              (Array.isArray(items) &&
                !items.some((it) =>
                  typeof it === "string" ? it.trim() : it.name.trim(),
                ))) && (
              <span
                className={styles.requiredDot}
                style={{ verticalAlign: "middle" }}
              />
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className={styles.editHintIcon}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </div>
            <div className={`${styles.statusDot} ${getStatus(items)}`} />
            {isCollapsible && (
              <button
                className={styles.btnToggleSection}
                onClick={() =>
                  setCollapsed((prev) => ({
                    ...prev,
                    [field as string]: !isCollapsed,
                  }))
                }
              >
                {isCollapsed ? "Expand" : "Collapse"}
              </button>
            )}
          </div>
        </div>
        {!isCollapsed && (
          <div className={styles.previewContent}>
            {field === "complaints" ? (
              <ChipInputEditor
                field={field}
                items={items}
                updateField={updateField}
                placeholder={placeholder}
              />
            ) : field === "investigations" ? (
              <InvestigationEditor
                field={field}
                items={items}
                updateField={updateField}
              />
            ) : (
              <BulletListEditor
                field={field}
                items={items}
                placeholder={placeholder}
                updateField={updateField}
                autoSaveStatus={autoSaveStatus}
                setAutoSaveStatus={setAutoSaveStatus}
                suggestTimer={suggestTimer}
                activeSuggestion={activeSuggestion}
                setActiveSuggestion={setActiveSuggestion}
                fetchSmartSuggestion={fetchSmartSuggestion}
              />
            )}
          </div>
        )}
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
      <div className={styles.page}>
        <TopBar
          title="Admission Record"
          backHref={`/portal/doctor-dashboard${
            searchParams.get("doctorId")
              ? `?doctorId=${searchParams.get("doctorId")}&doctorName=${encodeURIComponent(
                  searchParams.get("doctorName") || searchParams.get("docName") || ""
                )}`
              : ""
          }`}
        />

        {/* --- Sticky Patient Context Header --- */}
        {(summary.patientName ||
          summary.age ||
          summary.bed ||
          summary.severity) && (
          <div className={styles.stickyPatientHeader}>
            <div className={styles.stickyPatientInner}>
              {/* Left: Patient identity chips */}
              <div className={styles.stickyPatientPill}>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span className={styles.stickyPatientName}>
                  {summary.patientName || "—"}
                </span>
              </div>

              {summary.age && (
                <div className={styles.stickyPatientChip}>
                  <span className={styles.stickyChipLabel}>Age</span>
                  <span>
                    {summary.age} / {summary.sex || "M"}
                  </span>
                </div>
              )}

              {summary.bed && (
                <div className={styles.stickyPatientChip}>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  </svg>
                  <span className={styles.stickyChipLabel}>Bed</span>
                  <span>
                    {summary.ward ? `${summary.ward} – ` : ""}
                    {summary.bed}
                  </span>
                </div>
              )}

              <div
                className={`${styles.stickyPatientChip} ${styles[`severity${summary.severity || "Mild"}`]}`}
              >
                <span className={styles.severityDot} />
                <span>{summary.severity || "Mild"}</span>
              </div>

              {summary.doctor && (
                <div className={styles.stickyPatientChip}>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                  </svg>
                  <span>Dr. {summary.doctor}</span>
                </div>
              )}

              {/* Critical Alerts: Allergies + Comorbidities */}
              {(summary.allergies?.trim() ||
                summary.has_diabetes ||
                summary.has_hypertension ||
                summary.has_thyroid) && (() => {
                const flags: string[] = [];
                if (summary.allergies?.trim()) flags.push(summary.allergies.trim());
                if (summary.has_diabetes) flags.push("Diabetes");
                if (summary.has_hypertension) flags.push("Hypertension");
                if (summary.has_thyroid) flags.push("Thyroid");
                return (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                      background: "#fff1f2",
                      border: "1.5px solid #fecdd3",
                      borderRadius: 10,
                      padding: "6px 12px",
                      maxWidth: 260,
                    }}
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#e11d48"
                      strokeWidth="3"
                      style={{ marginTop: 2, flexShrink: 0 }}
                    >
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 900,
                          color: "#be123c",
                          textTransform: "uppercase",
                          letterSpacing: 0.8,
                        }}
                      >
                        Critical Alerts
                      </span>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 8px" }}>
                        {flags.map((flag, i) => (
                          <span
                            key={i}
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: "#9f1239",
                              display: "flex",
                              alignItems: "center",
                              gap: 3,
                            }}
                          >
                            <span style={{ color: "#e11d48", fontSize: 9 }}>•</span>
                            {flag.length > 22 ? flag.slice(0, 20) + "…" : flag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Right: Quick Actions */}
              <div className={styles.stickyQuickActions}>
                <button
                  className={styles.btnQuickSave}
                  onClick={handleFinalSubmit}
                  disabled={isSaving}
                  title="Save admission record"
                >
                  {isSaving ? (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      style={{ animation: "spin 1s linear infinite" }}
                    >
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                  ) : (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                      <polyline points="17 21 17 13 7 13 7 21" />
                      <polyline points="7 3 7 8 15 8" />
                    </svg>
                  )}
                  {isSaving ? "Saving…" : "Save"}
                </button>

                <button
                  className={styles.btnQuickSummary}
                  onClick={() => {
                    localStorage.setItem(
                      "admission_summary_preview",
                      JSON.stringify(summary),
                    );
                    const params = new URLSearchParams();
                    const dId = searchParams.get("doctorId");
                    const dName = searchParams.get("doctorName") || searchParams.get("docName");
                    if (dId) params.set("doctorId", dId);
                    if (dName) params.set("doctorName", dName);
                    const qs = params.toString();
                    router.push(`/portal/admission-record/summary${qs ? `?${qs}` : ""}`);
                  }}
                  title="View formatted clinical summary"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                  Generate Summary
                </button>
              </div>






            </div>
          </div>
        )}

        <main className={styles.main}>
          {renderWizardProgress()}
          <div
            className={`${styles.layout} ${isQuickMode ? styles.quickModeLayout : ""}`}
            style={!isQuickMode && step === 3 ? { gridTemplateColumns: "1fr", maxWidth: "1000px", margin: "0 auto" } : {}}
          >
            {!isQuickMode && (step === 1 || step === 2) && (
              <section className={styles.leftColumn}>
                {step === 1 && (
                  <>
                    {/* --- Smart Admission Assistant Panel --- */}
                    {(() => {
                      const admissionChecklist = [
                        { label: "Name", value: summary.patientName },
                        { label: "Age", value: summary.age },
                        { label: "Phone Number", value: summary.phone },
                        { label: "Doctor Assigned", value: summary.doctor },
                        { label: "Ward", value: summary.ward },
                        { label: "Bed", value: summary.bed },
                        { label: "Chief Complaints", value: summary.complaints?.length > 0 ? summary.complaints[0] : "" },
                      ];
                      const completed = admissionChecklist.filter((f) => !!f.value).length;
                      const total = admissionChecklist.length;
                      const allDone = completed === total;
                      return (
                        <div
                          className={styles.progressCard}
                          style={{
                            borderLeft: "4px solid #6366f1",
                            background: "linear-gradient(135deg, #f8f7ff 0%, #eef2ff 100%)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: 16,
                            }}
                          >
                            <div className={styles.cardTitle} style={{ margin: 0, color: "#4f46e5" }}>
                              <svg
                                width="17"
                                height="17"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#6366f1"
                                strokeWidth="2.5"
                              >
                                <path d="M9 11l3 3L22 4" />
                                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                              </svg>
                              ADMISSION STATUS
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                fontWeight: 800,
                                padding: "3px 10px",
                                borderRadius: 20,
                                background: allDone ? "#d1fae5" : "#e0e7ff",
                                color: allDone ? "#065f46" : "#4338ca",
                                letterSpacing: 0.3,
                              }}
                            >
                              {completed}/{total}
                            </div>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {admissionChecklist.map((item, i) => {
                              const done = !!item.value;
                              return (
                                <div
                                  key={i}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 10,
                                    padding: "7px 10px",
                                    borderRadius: 8,
                                    background: done ? "#f0fdf4" : "#fff7ed",
                                    border: `1px solid ${done ? "#bbf7d0" : "#fed7aa"}`,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: done ? "#166534" : "#92400e",
                                    transition: "all 0.2s ease",
                                  }}
                                >
                                  {done ? (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3">
                                      <path d="M20 6L9 17l-5-5" />
                                    </svg>
                                  ) : (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="3">
                                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                      <line x1="12" y1="9" x2="12" y2="13" />
                                      <line x1="12" y1="17" x2="12.01" y2="17" />
                                    </svg>
                                  )}
                                  <span style={{ flex: 1 }}>{item.label}</span>
                                  {!done && (
                                    <span
                                      style={{
                                        fontSize: 10,
                                        fontWeight: 700,
                                        color: "#b45309",
                                        background: "#fef3c7",
                                        padding: "1px 7px",
                                        borderRadius: 10,
                                        letterSpacing: 0.3,
                                      }}
                                    >
                                      Missing
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          <div
                            style={{
                              marginTop: 14,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              paddingTop: 12,
                              borderTop: "1px dashed #c7d2fe",
                            }}
                          >
                            <span style={{ fontSize: 11, color: "#6366f1", fontWeight: 700 }}>
                              Completion: {completed}/{total}
                            </span>
                            {allDone && (
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 800,
                                  color: "#059669",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 4,
                                }}
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                  <path d="M20 6L9 17l-5-5" />
                                </svg>
                                Ready to Submit
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* --- Alerts & History Panel --- */}
                    <div
                      className={styles.progressCard}
                      style={{
                        borderLeft: "4px solid #ef4444",
                        background: "linear-gradient(135deg, #fff5f5 0%, #fff1f2 100%)",
                        marginTop: 0,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 7,
                          marginBottom: 14,
                        }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5">
                          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                        </svg>
                        <span style={{ fontSize: 11, fontWeight: 900, color: "#b91c1c", textTransform: "uppercase", letterSpacing: 0.7 }}>
                          Alerts &amp; History
                        </span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px 8px", marginBottom: 12 }}>
                        {[
                          { key: "has_diabetes" as const, label: "Diabetes" },
                          { key: "has_hypertension" as const, label: "Hypertension" },
                          { key: "has_thyroid" as const, label: "Thyroid" },
                        ].map(({ key, label }) => (
                          <label
                            key={key}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 5,
                              fontSize: 12,
                              fontWeight: 600,
                              color: summary[key] ? "#b91c1c" : "#64748b",
                              background: summary[key] ? "#fee2e2" : "#f8fafc",
                              border: `1px solid ${summary[key] ? "#fca5a5" : "#e2e8f0"}`,
                              borderRadius: 8,
                              padding: "5px 8px",
                              cursor: "pointer",
                              transition: "all 0.15s",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={summary[key]}
                              onChange={(e) => updateField(key, e.target.checked)}
                              style={{ accentColor: "#ef4444", width: 12, height: 12 }}
                            />
                            {label}
                          </label>
                        ))}
                      </div>
                      <div style={{ marginBottom: 10 }}>
                        <label style={{ fontSize: 10, fontWeight: 800, color: "#ef4444", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 5 }}>
                          Critical Allergies
                        </label>
                        <textarea
                          value={summary.allergies || ""}
                          onChange={(e) => updateField("allergies", e.target.value)}
                          placeholder="Drug or environmental allergies..."
                          rows={2}
                          style={{
                            width: "100%",
                            border: "1px solid #fecaca",
                            background: "#fef2f2",
                            padding: "8px 10px",
                            borderRadius: 8,
                            outline: "none",
                            fontSize: 12,
                            resize: "none",
                            color: "#7f1d1d",
                            boxSizing: "border-box",
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 5 }}>
                          Past Surgeries
                        </label>
                        <input
                          type="text"
                          value={summary.past_surgeries || ""}
                          onChange={(e) => updateField("past_surgeries", e.target.value)}
                          placeholder="e.g. Appendectomy (2018)"
                          style={{
                            width: "100%",
                            border: "1px solid #e2e8f0",
                            background: "#f8fafc",
                            padding: "8px 10px",
                            borderRadius: 8,
                            outline: "none",
                            fontSize: 12,
                            color: "#334155",
                            boxSizing: "border-box",
                          }}
                        />
                      </div>
                    </div>
                  </>
                )}
                {step === 2 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {renderClinicalCard(
                      "Chief Complaints",
                      "complaints",
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                      </svg>,
                      "Add patient chief complaints (e.g. Fever, Cough)...",
                    )}
                    {renderClinicalCard(
                      "Findings",
                      "findings",
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                      </svg>,
                      "Enter objective clinical findings...",
                    )}
                  </div>
                )}
              </section>
            )}

            <section
              className={
                isQuickMode ? styles.quickModeColumn : styles.rightColumn
              }
            >
              {isQuickMode ? (
                <div className={styles.emergencyFadeIn}>
                  <div className={styles.emergencyCard}>
                    <div className={styles.cardHeader}>
                      <div
                        className={styles.cardTitle}
                        style={{ color: "#ef4444" }}
                      >
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                        >
                          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                        Patient Name
                      </div>
                    </div>
                    <input
                      className={styles.emergencyMainInput}
                      value={summary.patientName || ""}
                      onChange={(e) =>
                        updateField("patientName", e.target.value)
                      }
                      placeholder="Enter full name for emergency record..."
                      autoFocus
                    />
                  </div>

                  <div className={styles.emergencyGrid}>
                    <div className={styles.summaryCard}>
                      <div className={styles.cardHeader}>
                        <div className={styles.cardTitle}>
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          >
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                          </svg>
                          Chief Complaints
                        </div>
                      </div>
                      <ChipInputEditor
                        field="complaints"
                        items={summary.complaints}
                        updateField={updateField}
                        placeholder="Add chief complaints..."
                      />
                    </div>

                    <div
                      className={styles.summaryCard}
                      style={{ borderLeft: "4px solid #ef4444" }}
                    >
                      <div className={styles.cardHeader}>
                        <div className={styles.cardTitle}>
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          >
                            <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                          </svg>
                          Quick Vitals
                        </div>
                      </div>
                      <div className={styles.vitalsGrid}>
                        <div className={styles.vitalInputGroup}>
                          <label>Pulse (BPM)</label>
                          <input
                            type="number"
                            placeholder="72"
                            className={
                              summary.vitals_pulse &&
                              parseInt(summary.vitals_pulse) > 100
                                ? styles.vitalAbnormalPulse
                                : ""
                            }
                            value={summary.vitals_pulse}
                            onChange={(e) =>
                              updateField("vitals_pulse", e.target.value)
                            }
                          />
                        </div>
                        <div className={styles.vitalInputGroup}>
                          <label>SpO₂ (%)</label>
                          <input
                            type="number"
                            placeholder="98"
                            className={
                              summary.vitals_spo2 &&
                              parseInt(summary.vitals_spo2) < 94
                                ? styles.vitalAbnormalSpo2
                                : ""
                            }
                            value={summary.vitals_spo2}
                            onChange={(e) =>
                              updateField("vitals_spo2", e.target.value)
                            }
                          />
                        </div>
                        <div className={styles.vitalInputGroup}>
                          <label>BP (Sys/Dia)</label>
                          <div style={{ display: "flex", gap: 4 }}>
                            <input
                              type="number"
                              placeholder="120"
                              value={summary.vitals_bp_sys}
                              onChange={(e) =>
                                updateField("vitals_bp_sys", e.target.value)
                              }
                            />
                            <input
                              type="number"
                              placeholder="80"
                              value={summary.vitals_bp_dia}
                              onChange={(e) =>
                                updateField("vitals_bp_dia", e.target.value)
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      padding: "20px",
                      background: "#fffbeb",
                      borderRadius: 16,
                      border: "1px solid #fef3c7",
                      color: "#92400e",
                      fontSize: 13,
                      display: "flex",
                      gap: 12,
                      alignItems: "center",
                    }}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>
                      <strong>Emergency Intake</strong>: Administrative details
                      and full clinical history can be filled later by medical
                      staff.
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  {step === 1 && (
                    <div className={styles.stepFadeIn}>
                      <div className={styles.summaryCard}>
                        <div className={styles.cardHeader}>
                          <div className={styles.cardTitle}>
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                            >
                              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                              <circle cx="12" cy="7" r="4" />
                            </svg>
                            Patient Context
                          </div>
                          <div
                            className={`${styles.statusDot} ${getStatus(summary.patientName)}`}
                          />
                        </div>
                        <div className="field">
                          <label>
                            Full Name{" "}
                            {!summary.patientName && (
                              <span className={styles.requiredDot} />
                            )}
                          </label>
                          <input
                            type="text"
                            value={summary.patientName || ""}
                            onChange={(e) =>
                              updateField("patientName", e.target.value)
                            }
                          />
                        </div>
                        <div className={styles.patientBrief}>
                          <div className={styles.briefItem}>
                            <div className="field">
                              <label>
                                Age{" "}
                                {!summary.age && (
                                  <span className={styles.requiredDot} />
                                )}
                              </label>
                              <input
                                type="text"
                                value={summary.age || ""}
                                onChange={(e) =>
                                  updateField("age", e.target.value)
                                }
                              />
                            </div>
                            <div className="field">
                              <label>Sex</label>
                              <select
                                value={summary.sex || "Male"}
                                onChange={(e) =>
                                  updateField("sex", e.target.value)
                                }
                              >
                                <option>Male</option>
                                <option>Female</option>
                                <option>Other</option>
                              </select>
                            </div>
                          </div>
                          <div className="field">
                            <label>Phone Number</label>
                            <input
                              type="tel"
                              value={summary.phone || ""}
                              onChange={(e) =>
                                updateField("phone", e.target.value)
                              }
                            />
                          </div>
                          <div className="field">
                            <label>Department</label>
                            <input
                              type="text"
                              value={summary.department || ""}
                              onChange={(e) =>
                                updateField("department", e.target.value)
                              }
                              placeholder="e.g. Cardiology, Orthopedics"
                            />
                          </div>
                          <div className={styles.briefItem}>
                            <div className="field">
                              <label>
                                Ward{" "}
                                {!summary.ward && (
                                  <span className={styles.requiredDot} />
                                )}
                              </label>
                              <input
                                type="text"
                                value={summary.ward || ""}
                                onChange={(e) =>
                                  updateField("ward", e.target.value)
                                }
                                placeholder="Ward A"
                              />
                            </div>
                            <div className="field">
                              <label>
                                Bed No.{" "}
                                {!summary.bed && (
                                  <span className={styles.requiredDot} />
                                )}
                              </label>
                              <input
                                type="text"
                                value={summary.bed || ""}
                                onChange={(e) =>
                                  updateField("bed", e.target.value)
                                }
                                placeholder="102"
                              />
                            </div>
                          </div>
                          <div className={styles.briefItem}>
                            <div className="field">
                              <label>Admission Source</label>
                              <select
                                value={summary.admission_type}
                                onChange={(e) =>
                                  updateField("admission_type", e.target.value)
                                }
                              >
                                <option>OPD</option>
                                <option>Emergency</option>
                                <option>Referral</option>
                              </select>
                            </div>
                            <div className="field">
                              <label>Triage / Severity</label>
                              <div className={styles.triageGroup}>
                                {["Mild", "Moderate", "Severe"].map((lvl) => (
                                  <button
                                    key={lvl}
                                    onClick={() => updateField("severity", lvl)}
                                    className={`${styles.triageBtn} ${summary.severity === lvl ? styles.active : ""} ${styles[lvl.toLowerCase()]}`}
                                  >
                                    {lvl}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="field">
                            <label>Adm. Date & Time</label>
                            <input
                              type="datetime-local"
                              value={summary.date_admission || ""}
                              onChange={(e) =>
                                updateField("date_admission", e.target.value)
                              }
                            />
                          </div>
                          <div className="field">
                            <label>
                              Attending Doctor{" "}
                              {!summary.doctor && (
                                <span className={styles.requiredDot} />
                              )}
                            </label>
                            <select
                              value={summary.doctor || ""}
                              onChange={(e) =>
                                updateField("doctor", e.target.value)
                              }
                            >
                              <option value="">Select...</option>
                              {doctors?.map((d: any) => (
                                <option key={d.id} value={d.name}>
                                  Dr. {d.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className={styles.stepFadeIn}>
                      <div
                        className={`${styles.summaryCard} ${styles.diagnosisHighlight}`}
                      >
                        <div className={styles.cardHeader}>
                          <div className={styles.cardTitle}>
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                            >
                              <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"></path>
                              <path d="M8 15v1a6 6 0 0 0 6 6h2a2 2 0 0 0 2-2v-3"></path>
                              <circle cx="16" cy="11" r="2"></circle>
                            </svg>
                            Provisional Diagnosis
                          </div>
                          <div
                            className={`${styles.statusDot} ${getStatus(summary.diagnosis)}`}
                          />
                        </div>
                        <input
                          className={styles.bulletInput}
                          value={summary.diagnosis || ""}
                          onChange={(e) => updateField("diagnosis", e.target.value)}
                          placeholder="Enter provisional diagnosis..."
                        />
                      </div>
                    </div>
                  )}

                  {step === 3 && (
                    <div className={styles.stepFadeIn}>
                      <div
                        className={`${styles.summaryCard} ${styles.diagnosisHighlight}`}
                        style={{
                          borderBottom: "4px solid var(--sanctuary-primary)",
                        }}
                      >
                        <div className={styles.cardHeader}>
                          <div className={styles.cardTitle}>
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                            >
                              <circle cx="12" cy="12" r="10"></circle>
                              <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                            Final Diagnosis
                          </div>
                          <div
                            className={`${styles.statusDot} ${getStatus(summary.final_diagnosis)}`}
                          />
                        </div>
                        <input
                          className={styles.bulletInput}
                          value={summary.final_diagnosis || ""}
                          onChange={(e) =>
                            updateField("final_diagnosis", e.target.value)
                          }
                          placeholder="Enter final diagnosis (if confirmed)..."
                        />
                      </div>

                      <div
                        className={styles.summaryCard}
                        style={{ borderLeft: "4px solid #8b5cf6" }}
                      >
                        <div className={styles.cardHeader}>
                          <div className={styles.cardTitle}>
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                            >
                              <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                            </svg>
                            Doctor Observations
                          </div>
                          <div
                            className={`${styles.statusDot} ${getStatus(summary.doctor_observations)}`}
                          />
                        </div>
                        <textarea
                          value={summary.doctor_observations || ""}
                          onChange={(e) =>
                            updateField("doctor_observations", e.target.value)
                          }
                          placeholder="Enter additional monitoring requirements or clinical observations..."
                          style={{
                            width: "100%",
                            minHeight: 100,
                            border: "none",
                            resize: "vertical",
                            background: "#f5f3ff",
                            padding: 12,
                            borderRadius: 8,
                            outline: "none",
                            fontSize: 14,
                            color: "#4c1d95",
                          }}
                        ></textarea>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 24,
                        }}
                      >
                        {renderClinicalCard(
                          "Investigations Advised",
                          "investigations",
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          >
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                            <polyline points="10 9 9 9 8 9"></polyline>
                          </svg>,
                          "Order lab tests or imaging...",
                        )}
                        {renderClinicalCard(
                          "Initial Treatment Plan",
                          "treatment_plan",
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          >
                            <path d="m4.83 6.74 4.58 9.15a3 3 0 1 1-5.36 2.68L4.83 6.74ZM12 22a3 3 0 1 1-3-3 3 3 0 0 1 3 3Zm9-9a3 3 0 1 1-3-3 3 3 0 0 1 3 3Zm0-9-4.58 9.15a3 3 0 1 1 5.36-2.68L21 4Z"></path>
                          </svg>,
                          "Outline medication or management plan...",
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>
          </div>
        </main>

        <div className={styles.stickyBar}>
          <div className={styles.stickyBarInner}>
            <div style={{ marginRight: "auto", display: "flex", gap: 12 }}>
              <button className={styles.btnClearSticky} onClick={handleClear}>
                ️ {isQuickMode ? "Reset" : "Clear"}
              </button>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              {!isQuickMode && step > 1 && (
                <button
                  className={styles.btnSecondarySticky}
                  onClick={() => setStep((s) => s - 1)}
                >
                  ← Previous Step
                </button>
              )}

              {isQuickMode ? (
                <button
                  className={styles.btnSaveSticky}
                  onClick={handleFinalSubmit}
                  style={{ background: "#ef4444", border: "none" }}
                >
                  Submit Quick Admission
                </button>
              ) : step < 3 ? (
                <button
                  className={styles.btnSaveSticky}
                  onClick={() => setStep((s) => s + 1)}
                >
                  Next Step: {step === 1 ? "Clinical Info" : "Management Plan"}{" "}
                  →
                </button>
              ) : (
                <button
                  className={styles.btnSaveSticky}
                  onClick={handleFinalSubmit}
                >
                  Finalize Admission Record
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function AdmissionRecordPage() {
  return (
    <Suspense fallback={<div>Loading Admission Record...</div>}>
      <AdmissionRecordRedesign />
    </Suspense>
  );
}
