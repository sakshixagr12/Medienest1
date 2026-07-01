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
  patientId?: string;
  patientName: string;
  phone: string;
  age: string;
  sex: string;
  doctor: string;
  ward: string;
  bed: string;
  department: string;
  alternateNumber?: string;
  address?: string;
  dateOfBirth?: string;
  referringDoctor?: string;
  relativeName?: string;
  relationship?: string;
  guardianPhone?: string;
  occupation?: string;
  admissionCategory?: string;
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
    date_admission: "",
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

  // Autocomplete State
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const quickDropdownRef = useRef<HTMLDivElement>(null);

  const suggestTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const isNew = searchParams.get("new") === "true";
    if (isNew) {
      localStorage.removeItem("admission_draft");
      localStorage.removeItem("admission_draft_step");
    }

    const draftStr = localStorage.getItem("admission_draft");
    if (draftStr && !isNew) {
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
        console.error("Draft error", e);
      }
    } else {
      const d = new Date();
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      setSummary((prev) => ({ ...prev, date_admission: d.toISOString().slice(0, 16) }));
    }

    if (docNameParam) {
      setSummary((prev) => ({ ...prev, doctor: docNameParam }));
    } else if (doctors && doctors.length > 0) {
      setSummary((prev) => ({ ...prev, doctor: doctors[0].name }));
    }
    setClinicLoading(false);
  }, [docNameParam, doctors, searchParams.get("patientId"), searchParams.get("draftId"), searchParams.get("new")]);

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

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(summary.patientName || "");
    }, 300);
    return () => clearTimeout(timer);
  }, [summary.patientName]);

  useEffect(() => {
    const searchPatients = async () => {
      if (!debouncedSearchTerm || debouncedSearchTerm.length < 2) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }
      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from("patients")
          .select("*")
          .eq("clinic_id", clinic?.id)
          .or(`name.ilike.%${debouncedSearchTerm}%,contact.ilike.%${debouncedSearchTerm}%,id.eq.${debouncedSearchTerm}`)
          .limit(10);
        if (error) throw error;
        setSearchResults(data || []);
      } catch (err) {
        console.error("Error searching patients", err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };
    if (showDropdown) {
      searchPatients();
    }
  }, [debouncedSearchTerm, clinic?.id, supabase, showDropdown]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
      if (quickDropdownRef.current && !quickDropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePatientSelect = (patient: any) => {
    setSummary((prev) => ({
      ...prev,
      patientId: patient.id,
      patientName: patient.name,
      phone: patient.contact || prev.phone,
      age: patient.age ? `${patient.age} Years` : prev.age,
      sex: patient.gender || prev.sex,
      dateOfBirth: patient.date_of_birth || prev.dateOfBirth,
      address: patient.address || prev.address,
      has_diabetes: patient.has_diabetes || prev.has_diabetes,
      has_hypertension: patient.has_hypertension || prev.has_hypertension,
      has_thyroid: patient.has_thyroid || prev.has_thyroid,
      allergies: patient.allergies || prev.allergies,
      past_surgeries: patient.past_surgeries || prev.past_surgeries,
    }));
    setShowDropdown(false);
    setActiveIndex(-1);
  };

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
          date_admission: summary.date_admission ? new Date(summary.date_admission).toISOString() : new Date().toISOString(),
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
        router.push(`/demo1/portal/doctor-dashboard/patients/${patientId}${qs ? `?${qs}` : ""}`);
      } else {
        router.push(`/demo1/portal/doctor-dashboard${qs ? `?${qs}` : ""}`);
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
        date_admission: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
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
                  onClick={() => setStep(s.id)}
                  style={{ cursor: "pointer" }}
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

  const stateRef = useRef<any>({});
  stateRef.current = { summary, isQuickMode, step, showDropdown, handleFinalSubmit, saveDraft, setStep, updateField };

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const { summary, isQuickMode, step, showDropdown, handleFinalSubmit, saveDraft, setStep, updateField } = stateRef.current;
      
      // Ctrl+S to save draft
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveDraft(summary);
        return;
      }
      
      // Ctrl+Enter to continue/submit
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (isQuickMode) {
          handleFinalSubmit();
        } else if (step < 3) {
          setStep((s: number) => s + 1);
        } else {
          handleFinalSubmit();
        }
        return;
      }
      
      // Arrow keys for triage
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
         const active = document.activeElement as HTMLElement;
         if (active && (active.hasAttribute('data-triage') || active.id?.startsWith('triageBtn-'))) {
             e.preventDefault();
             const lvls = ["Mild", "Moderate", "Severe"];
             const current = lvls.indexOf(summary.severity || "Mild");
             let nextIdx = current;
             if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextIdx = (current + 1) % 3;
             if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') nextIdx = (current + 2) % 3;
             updateField("severity", lvls[nextIdx]);
             setTimeout(() => document.getElementById(`triageBtn-${lvls[nextIdx]}`)?.focus(), 0);
             return;
         }
      }
      
      // Enter to go to next field
      if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        if (e.defaultPrevented) return;
        const active = document.activeElement as HTMLElement;
        if (active) {
          if (active.tagName === 'TEXTAREA' || active.tagName === 'BUTTON' || active.tagName === 'A') {
            return;
          }
          if (showDropdown && active.id === 'patientSearchInput') {
            return;
          }
          if (active.tagName === 'INPUT' || active.tagName === 'SELECT' || active.hasAttribute('data-triage')) {
            e.preventDefault();
            const focusable = Array.from(document.querySelectorAll('input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [data-triage="true"]'))
              .filter(el => {
                const rect = el.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0 && (el as HTMLElement).tabIndex !== -1;
              });
            const index = focusable.indexOf(active);
            if (index > -1 && index < focusable.length - 1) {
              (focusable[index + 1] as HTMLElement).focus();
            }
          }
        }
      }
    };
    
    document.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown, true);
  }, []);

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
          title="Admission Management"
          backHref={`/demo1/portal/doctor-dashboard${
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

              {/* Allergy Alert */}
              {(typeof summary.allergies === 'string' ? summary.allergies : Array.isArray(summary.allergies) ? summary.allergies.join(', ') : "")?.trim() && (
                <div className={styles.allergyAlertChip}>
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  >
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <span>
                    {(() => {
                      const algStr = typeof summary.allergies === 'string' ? summary.allergies : Array.isArray(summary.allergies) ? summary.allergies.join(', ') : "";
                      return algStr.length > 30 ? algStr.slice(0, 28) + "…" : algStr;
                    })()}{" "}
                    Allergy
                  </span>
                </div>
              )}

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
                    router.push(`/demo1/portal/admission-record/summary${qs ? `?${qs}` : ""}`);
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
            style={!isQuickMode ? (step === 3 ? { gridTemplateColumns: "1fr", maxWidth: "1000px", margin: "0 auto" } : {}) : {}}
          >
            {!isQuickMode && (step === 1 || step === 2) && (
              <section className={styles.leftColumn}>
                {step === 1 && (
                  <>
                {(() => {
                  const admissionChecklist = step === 1 ? [
                    { label: "Name", value: summary.patientName, field: "patientName" },
                    { label: "Age", value: summary.age, field: "age" },
                    { label: "Phone Number", value: summary.phone, field: "phone" },
                    { label: "Doctor Assigned", value: summary.doctor, field: "doctor" },
                    { label: "Ward", value: summary.ward, field: "ward" },
                    { label: "Bed", value: summary.bed, field: "bed" }
                  ] : step === 2 ? [
                    { label: "Chief Complaint", value: summary.complaints?.length > 0 ? summary.complaints[0] : "", field: "complaints" },
                    { label: "Vitals (Temp)", value: summary.vitals_temp, field: "vitals_temp" },
                    { label: "Vitals (BP)", value: summary.vitals_bp_sys && summary.vitals_bp_dia ? "Done" : "", field: "vitals_bp_sys" },
                    { label: "Vitals (Pulse)", value: summary.vitals_pulse, field: "vitals_pulse" },
                    { label: "Provisional Diagnosis", value: summary.diagnosis, field: "diagnosis" }
                  ] : [
                    { label: "Final Diagnosis", value: summary.final_diagnosis, field: "final_diagnosis" },
                    { label: "Treatment Plan", value: summary.treatment_plan?.length > 0 ? summary.treatment_plan[0] : "", field: "treatment_plan" }
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
                              onClick={() => {
                                if (!done) {
                                  const el = document.getElementById(item.field);
                                  if (el) {
                                    el.scrollIntoView({ behavior: "smooth", block: "center" });
                                    el.focus({ preventScroll: true });
                                  }
                                }
                              }}
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
                                cursor: done ? "default" : "pointer",
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

                  <div className={styles.summaryCard} style={{ marginTop: 12 }}>
                    <div className={styles.cardHeader} style={{ marginBottom: 0 }}>
                      <div className={styles.cardTitle} style={{ fontSize: 11, textTransform: 'uppercase', color: '#16a34a' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                        ALERTS & HISTORY
                      </div>
                    </div>
                    <div style={{ marginTop: 12, fontSize: 13, color: '#0f172a', fontWeight: 600 }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                         <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                         No known alerts. First admission.
                      </div>
                    </div>
                  </div>

                  </>
                )}
                {step === 2 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {renderClinicalCard(
                      "Complaints",
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
                      "Add patient complaints (e.g. Fever, Cough)...",
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
                isQuickMode ? styles.quickModeColumn : (step === 1 ? styles.mainColumn : styles.mainColumn)
              }
              style={step !== 1 ? { gridColumn: "span 2" } : {}}
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
                    <div style={{ position: "relative" }} ref={quickDropdownRef}>
                      <input
                        className={styles.emergencyMainInput}
                        value={summary.patientName || ""}
                        onChange={(e) => {
                          updateField("patientName", e.target.value);
                          setShowDropdown(true);
                          setActiveIndex(-1);
                        }}
                        onFocus={() => {
                          if (summary.patientName?.length >= 2) setShowDropdown(true);
                        }}
                        onKeyDown={(e) => {
                          if (!showDropdown) return;
                          if (e.key === "ArrowDown") {
                            e.preventDefault();
                            setActiveIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : prev));
                          } else if (e.key === "ArrowUp") {
                            e.preventDefault();
                            setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev));
                          } else if (e.key === "Enter") {
                            e.preventDefault();
                            if (activeIndex >= 0 && activeIndex < searchResults.length) {
                              handlePatientSelect(searchResults[activeIndex]);
                            }
                          } else if (e.key === "Escape") {
                            setShowDropdown(false);
                          }
                        }}
                        placeholder="Enter full name for emergency record..."
                        autoFocus
                      />
                      {showDropdown && (debouncedSearchTerm.length >= 2) && (
                        <div className={styles.patientDropdown}>
                          {isSearching ? (
                            <div className={styles.dropdownItem}>Searching...</div>
                          ) : searchResults.length > 0 ? (
                            searchResults.map((patient, idx) => (
                              <div
                                key={patient.id}
                                className={`${styles.dropdownItem} ${idx === activeIndex ? styles.dropdownItemActive : ""}`}
                                onClick={() => handlePatientSelect(patient)}
                                onMouseEnter={() => setActiveIndex(idx)}
                              >
                                <div className={styles.dropdownName}>{patient.name}</div>
                                <div className={styles.dropdownDetails}>
                                  {patient.id.slice(0, 8)} • {patient.age ? `${patient.age}Y` : "N/A"} / {patient.gender || "U"} • {patient.contact || "No Phone"}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className={styles.dropdownItem} onClick={() => setShowDropdown(false)}>
                              <div style={{ color: "#6b7280", marginBottom: 4 }}>No patient found.</div>
                              <div style={{ color: "#4f46e5", fontSize: 12, fontWeight: 500 }}>+ Register New Patient</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
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
                          Main Complaints
                        </div>
                      </div>
                      <ChipInputEditor
                        field="complaints"
                        items={summary.complaints}
                        updateField={updateField}
                        placeholder="Add major symptoms..."
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
                      <div className={styles.mainLayout}>
                        {/* --- Main Left Column --- */}
                        <div className={styles.mainColumn}>
                          
                          {/* Patient Search Card */}
                          <div className={styles.summaryCard}>
                            <div className={styles.patientSearchHeader}>
                              <div className={styles.patientSearchHeaderLeft}>
                                <div className={styles.cardTitle}>
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                                    <circle cx="12" cy="7" r="4" />
                                  </svg>
                                  Patient Search
                                </div>
                                <span className={styles.cardTitleBadge}>REQUIRED</span>
                              </div>
                              <button type="button" className={styles.btnRegisterNew}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                Register New Patient
                              </button>
                            </div>
                            <div className="field" style={{ position: "relative" }} ref={dropdownRef}>
                              <div style={{ position: "relative" }}>
                                <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                                <input
                                  type="text"
                                  id="patientSearchInput"
                                  value={summary.patientName || ""}
                                  onChange={(e) => {
                                    updateField("patientName", e.target.value);
                                    setShowDropdown(true);
                                    setActiveIndex(-1);
                                  }}
                                  onFocus={() => {
                                    if (summary.patientName?.length >= 2) setShowDropdown(true);
                                  }}
                                  onKeyDown={(e) => {
                                    if (!showDropdown) return;
                                    if (e.key === "ArrowDown") {
                                      e.preventDefault();
                                      setActiveIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : prev));
                                    } else if (e.key === "ArrowUp") {
                                      e.preventDefault();
                                      setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev));
                                    } else if (e.key === "Enter") {
                                      e.preventDefault();
                                      if (activeIndex >= 0 && activeIndex < searchResults.length) {
                                        handlePatientSelect(searchResults[activeIndex]);
                                      }
                                    } else if (e.key === "Escape") {
                                      setShowDropdown(false);
                                    }
                                  }}
                                  style={{ paddingLeft: 36 }}
                                  placeholder="Search by Patient ID, Name or Mobile Number"
                                />
                              </div>
                              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6, paddingLeft: 2 }}>Type at least 2 characters to search</div>
                              
                              {showDropdown && (debouncedSearchTerm.length >= 2) && (
                                <div className={styles.patientDropdown}>
                                  {isSearching ? (
                                    <div className={styles.dropdownItem}>Searching...</div>
                                  ) : searchResults.length > 0 ? (
                                    searchResults.map((patient, idx) => (
                                      <div
                                        key={patient.id}
                                        className={`${styles.dropdownItem} ${idx === activeIndex ? styles.dropdownItemActive : ""}`}
                                        onClick={() => handlePatientSelect(patient)}
                                        onMouseEnter={() => setActiveIndex(idx)}
                                      >
                                        <div className={styles.dropdownName}>{patient.name}</div>
                                        <div className={styles.dropdownDetails}>
                                          {patient.id.slice(0, 8)} • {patient.age ? `${patient.age}Y` : "N/A"} / {patient.gender || "U"} • {patient.contact || "No Phone"}
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className={styles.dropdownItem} onClick={() => setShowDropdown(false)}>
                                      <div style={{ color: "#6b7280", marginBottom: 4 }}>No patient found.</div>
                                      <div style={{ color: "#4f46e5", fontSize: 12, fontWeight: 500 }}>+ Register New Patient</div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Selected Patient Card */}
                          {summary.patientName && (
                            <div className={styles.summaryCard} style={{ padding: 0, overflow: 'hidden' }}>
                              <div style={{ background: '#f8fafc', padding: '12px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                SELECTED PATIENT
                              </div>
                              <div className={styles.selectedPatientCard}>
                                <div className={styles.selectedPatientInfo}>
                                  <div className={styles.patientAvatar}>
                                    {summary.patientName.substring(0,2).toUpperCase()}
                                  </div>
                                  <div className={styles.patientDetailsCompact}>
                                    <div className={styles.patientDetailsName}>
                                      {summary.patientName}
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="3"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                      <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>{summary.sex || 'Female'}</span>
                                    </div>
                                    <div className={styles.patientDetailsSub}>
                                      {summary.patientId ? summary.patientId.slice(0, 8).toUpperCase() : 'N/A'} • {summary.age || 'N/A'} • {summary.dateOfBirth || 'N/A'}
                                    </div>
                                    <div className={styles.patientDetailsSub}>
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                      {summary.phone || 'N/A'}
                                    </div>
                                  </div>
                                </div>
                                <button 
                                  type="button" 
                                  className={styles.btnClearPatient}
                                  onClick={() => {
                                    updateField('patientName', '');
                                    updateField('patientId', undefined);
                                    updateField('age', '');
                                    updateField('sex', 'Male');
                                    updateField('phone', '');
                                    updateField('dateOfBirth', '');
                                    updateField('address', '');
                                  }}
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                  Clear Patient
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Patient Details Card */}
                          <div className={styles.summaryCard}>
                            <div className={styles.cardHeader}>
                              <div className={styles.cardTitle}>Patient Details</div>
                            </div>
                            <div className={styles.grid3Col}>
                              <div className="field">
                                <label>Age</label>
                                <div style={{ display: "flex", gap: 8 }}>
                                  <input
                                    id="age"
                                    type="number"
                                    max="130"
                                    value={summary.age?.match(/\d+/)?.[0] || ""}
                                    onChange={(e) => {
                                      let val = parseInt(e.target.value);
                                      if (isNaN(val)) return updateField("age", "");
                                      if (val > 130) val = 130;
                                      const unit = summary.age?.match(/[a-zA-Z]+/)?.[0] || "Years";
                                      updateField("age", `${val} ${unit}`);
                                    }}
                                    style={{ flex: 1, minWidth: 0 }}
                                  />
                                  <select
                                    value={summary.age?.match(/[a-zA-Z]+/)?.[0] || "Years"}
                                    onChange={(e) => {
                                      const num = summary.age?.match(/\d+/)?.[0] || "";
                                      if (num) updateField("age", `${num} ${e.target.value}`);
                                    }}
                                    style={{ width: "90px", flexShrink: 0 }}
                                  >
                                    <option value="Years">Years</option>
                                    <option value="Months">Months</option>
                                    <option value="Days">Days</option>
                                  </select>
                                </div>
                              </div>
                              <div className="field">
                                <label>Date of Birth</label>
                                <input type="date" value={summary.dateOfBirth || ""} onChange={(e) => updateField("dateOfBirth", e.target.value)} />
                              </div>
                              <div className="field">
                                <label>Sex</label>
                                <select value={summary.sex || "Female"} onChange={(e) => updateField("sex", e.target.value)}>
                                  <option>Female</option>
                                  <option>Male</option>
                                  <option>Other</option>
                                </select>
                              </div>
                            </div>

                            <div className={styles.grid2Col}>
                              <div className="field">
                                <label>Phone Number</label>
                                <input
                                  type="tel"
                                  value={summary.phone ? (summary.phone.length > 5 ? `${summary.phone.slice(0, 5)} ${summary.phone.slice(5, 10)}` : summary.phone) : ""}
                                  onChange={(e) => updateField("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                                />
                              </div>
                              <div className="field">
                                <label>Alternate Number</label>
                                <input
                                  type="tel"
                                  placeholder="Enter alternate number"
                                  value={summary.alternateNumber || ""}
                                  onChange={(e) => updateField("alternateNumber", e.target.value.replace(/\D/g, "").slice(0, 10))}
                                />
                              </div>
                            </div>

                            <div className="field">
                              <label>Address</label>
                              <input
                                type="text"
                                placeholder="Lucknow, Uttar Pradesh, India"
                                value={summary.address || ""}
                                onChange={(e) => updateField("address", e.target.value)}
                              />
                            </div>
                            
                            <div className="field">
                              <label>Department</label>
                              <input 
                                type="text"
                                placeholder="e.g. Cardiology, Orthopedics"
                                value={summary.department || ""} 
                                onChange={(e) => updateField("department", e.target.value)} 
                              />
                            </div>
                          </div>

                          {/* Admission Details Card */}
                          <div className={styles.summaryCard}>
                            <div className={styles.cardHeader}>
                              <div className={styles.cardTitle}>Admission Details</div>
                            </div>
                            <div className={styles.grid2Col}>
                              <div className="field">
                                <label>Admission Source</label>
                                <select value={summary.admission_type || "OPD"} onChange={(e) => updateField("admission_type", e.target.value)}>
                                  <option>OPD</option>
                                  <option>Emergency</option>
                                  <option>Referral</option>
                                </select>
                              </div>
                              <div className="field">
                                <label>Admission Type</label>
                                <div className={styles.segmentedControl}>
                                  <button type="button" className={`${styles.segmentBtn} ${summary.admissionCategory !== 'Day Care' ? styles.active : ''}`} onClick={() => updateField('admissionCategory', 'IPD')}>IPD</button>
                                  <button type="button" className={`${styles.segmentBtn} ${summary.admissionCategory === 'Day Care' ? styles.active : ''}`} onClick={() => updateField('admissionCategory', 'Day Care')}>Day Care</button>
                                </div>
                              </div>
                            </div>

                            <div className={styles.grid2Col}>
                              <div className="field">
                                <label>Ward</label>
                                <select value={summary.ward || ""} onChange={(e) => updateField("ward", e.target.value)}>
                                  <option value="">Select Ward</option>
                                  <option value="Ward A">Ward A</option>
                                  <option value="Ward B">Ward B</option>
                                </select>
                              </div>
                              <div className="field">
                                <label>Bed No.</label>
                                <input type="text" placeholder="102" value={summary.bed || ""} onChange={(e) => updateField("bed", e.target.value)} />
                              </div>
                            </div>

                            <div className="field">
                              <label>Admission Date &amp; Time</label>
                              <div style={{ display: 'flex', gap: 12 }}>
                                <input
                                  type="datetime-local"
                                  style={{ flex: 1 }}
                                  value={summary.date_admission || ""}
                                  onChange={(e) => updateField("date_admission", e.target.value)}
                                />
                                <button type="button" className={styles.btnNow} onClick={() => updateField("date_admission", new Date().toISOString().slice(0, 16))}>
                                  Now
                                </button>
                              </div>
                            </div>

                            <div className="field">
                              <label>Triage / Severity</label>
                              <div className={styles.triageGroup} data-triage="true" tabIndex={0}>
                                {["Mild", "Moderate", "Severe"].map((lvl, i) => (
                                  <button
                                    key={lvl}
                                    type="button"
                                    id={`triageBtn-${lvl}`}
                                    onClick={() => updateField("severity", lvl)}
                                    className={`${styles.triageBtn} ${summary.severity === lvl ? styles.active : ""} ${styles[lvl.toLowerCase()]}`}
                                  >
                                    {lvl}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className={styles.grid2Col}>
                              <div className="field">
                                <label>Referring Doctor</label>
                                <select value={summary.referringDoctor || ""} onChange={(e) => updateField("referringDoctor", e.target.value)}>
                                  <option value="">Select Doctor</option>
                                  <option value="Dr. A">Dr. A</option>
                                  <option value="Dr. B">Dr. B</option>
                                </select>
                              </div>
                              <div className="field">
                                <label>Attending Doctor</label>
                                <select value={summary.doctor || ""} onChange={(e) => updateField("doctor", e.target.value)}>
                                  <option value="">Select Doctor</option>
                                  {doctors?.map((d: any) => (
                                    <option key={d.id} value={d.name}>Dr. {d.name}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            </div>
                          </div>

                          {/* Additional Information */}
                          <div className={styles.summaryCard}>
                            <div className={styles.cardHeader} style={{ marginBottom: 0 }}>
                              <div className={styles.cardTitle} style={{ fontSize: 13, color: '#334155' }}>
                                Additional Information (Optional)
                              </div>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"></polyline></svg>
                            </div>
                            <div style={{ marginTop: 20 }}>
                               <div className={styles.grid2Col}>
                                 <div className="field">
                                   <label>Relative / Guardian Name</label>
                                   <input type="text" placeholder="Enter name" value={summary.relativeName || ""} onChange={(e) => updateField("relativeName", e.target.value)} />
                                 </div>
                                 <div className="field">
                                   <label>Relationship</label>
                                   <select value={summary.relationship || ""} onChange={(e) => updateField("relationship", e.target.value)}>
                                     <option value="">Select relationship</option>
                                     <option value="Spouse">Spouse</option>
                                     <option value="Parent">Parent</option>
                                     <option value="Child">Child</option>
                                   </select>
                                 </div>
                               </div>
                               <div className={styles.grid2Col} style={{ marginTop: 16 }}>
                                 <div className="field">
                                   <label>Guardian Phone</label>
                                   <input type="tel" placeholder="Enter phone number" value={summary.guardianPhone || ""} onChange={(e) => updateField("guardianPhone", e.target.value)} />
                                 </div>
                                 <div className="field">
                                   <label>Occupation</label>
                                   <input type="text" placeholder="Enter occupation" value={summary.occupation || ""} onChange={(e) => updateField("occupation", e.target.value)} />
                                 </div>
                               </div>
                            </div>
                          </div>

                             </div>
                          </div>

                          {/* Attachments (Moved here) */}
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
                                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                                </svg>
                                Attachments
                              </div>
                            </div>
                            <div className={styles.uploadZone}>
                              <input
                                type="file"
                                multiple
                                accept="image/*,application/pdf"
                                onChange={handleFileUpload}
                                className={styles.fileInputHidden}
                                id="file-upload"
                              />
                              <label htmlFor="file-upload" className={styles.uploadLabel}>
                                <svg
                                  width="24"
                                  height="24"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                >
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                                </svg>
                                <span>Upload Reports</span>
                              </label>
                            </div>
                            <div className={styles.attachmentList}>
                              {summary.attachments.map((file, i) => (
                                <div key={i} className={styles.attachmentItem}>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div className={styles.fileName}>{file.name}</div>
                                    <div className={styles.fileMeta}>
                                      {(file.size / 1024 / 1024).toFixed(2)} MB
                                    </div>
                                  </div>
                                  <div style={{ display: "flex", gap: 10 }}>
                                    <a
                                      href={file.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={styles.btnFileAction}
                                    >
                                      View
                                    </a>
                                    <button
                                      onClick={() => handleDeleteAttachment(i)}
                                      className={styles.btnFileDelete}
                                    >
                                      ️
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                        </div>
                      </div>
                    </div>
                  ) : null}

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
                          onChange={(e) =>
                            updateField("diagnosis", e.target.value)
                          }
                          placeholder="Enter provisional diagnosis..."
                        />
                      </div>

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
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                              <polyline points="14 2 14 8 20 8"></polyline>
                              <line x1="16" y1="13" x2="8" y2="13"></line>
                              <line x1="16" y1="17" x2="8" y2="17"></line>
                              <polyline points="10 9 9 9 8 9"></polyline>
                            </svg>
                            History of Present Illness (HPI)
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                            }}
                          >
                            <div
                              className={`${styles.statusDot} ${getStatus(summary.hpi)}`}
                            />
                            <button
                              className={styles.btnToggleSection}
                              onClick={() =>
                                setCollapsed((prev) => ({
                                  ...prev,
                                  hpi: !collapsed.hpi,
                                }))
                              }
                            >
                              {collapsed.hpi ? "Expand" : "Collapse"}
                            </button>
                          </div>
                        </div>
                        {!collapsed.hpi && (
                          <textarea
                            value={summary.hpi || ""}
                            onChange={(e) => updateField("hpi", e.target.value)}
                            placeholder="Enter history of present illness (HPI) details..."
                            style={{
                              width: "100%",
                              minHeight: 80,
                              border: "none",
                              resize: "vertical",
                              background: "#f8fafc",
                              padding: 12,
                              borderRadius: 8,
                              outline: "none",
                              fontSize: 14,
                            }}
                          ></textarea>
                        )}
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
                            Baseline Vitals
                          </div>
                          <div
                            className={`${styles.statusDot} ${getStatus(summary.vitals_pulse || summary.vitals_bp_sys)}`}
                          />
                        </div>

                        <div className={styles.vitalsGrid}>
                          <div className={styles.vitalInputGroup}>
                            <label>BP (Systolic/Diastolic)</label>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <input
                                type="number"
                                placeholder="Sys"
                                value={summary.vitals_bp_sys}
                                onChange={(e) =>
                                  updateField("vitals_bp_sys", e.target.value)
                                }
                              />
                              <span>/</span>
                              <input
                                type="number"
                                placeholder="Dia"
                                value={summary.vitals_bp_dia}
                                onChange={(e) =>
                                  updateField("vitals_bp_dia", e.target.value)
                                }
                              />
                            </div>
                          </div>
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
                            <label>Temp (°F)</label>
                            <input
                              type="number"
                              step="0.1"
                              placeholder="98.6"
                              value={summary.vitals_temp}
                              onChange={(e) =>
                                updateField("vitals_temp", e.target.value)
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
                        </div>

                        {getVitalsAlerts(summary).map((alert, idx) => (
                          <div
                            key={idx}
                            className={`${styles.clinicalAlert} ${alert.type === "critical" ? styles.criticalAlert : ""}`}
                          >
                            {alert.label}
                          </div>
                        ))}
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

            {!isQuickMode && step === 1 && (
              <section className={styles.sidebar}>
                {/* Alerts & History */}
                <div className={styles.alertCard}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 800, color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    ALERTS &amp; HISTORY
                  </div>
                  
                  {((summary.allergies || "").trim() || summary.has_diabetes || summary.has_hypertension || summary.has_thyroid) ? (
                    <>
                      {(summary.allergies || "").trim() && (
                        <div className={`${styles.alertItem} ${styles.alertRed}`}>
                          <div className={styles.alertIcon}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg></div>
                          <div className={styles.alertContent}>
                            <div className={styles.alertTitle}>Allergy</div>
                            <div className={styles.alertSub}>{summary.allergies}</div>
                          </div>
                        </div>
                      )}
                      
                      {summary.has_diabetes && (
                        <div className={`${styles.alertItem} ${styles.alertYellow}`}>
                          <div className={styles.alertIcon}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg></div>
                          <div className={styles.alertContent}>
                            <div className={styles.alertTitle}>Condition</div>
                            <div className={styles.alertSub}>Diabetes</div>
                          </div>
                        </div>
                      )}
                      
                      {summary.has_hypertension && (
                        <div className={`${styles.alertItem} ${styles.alertYellow}`}>
                          <div className={styles.alertIcon}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg></div>
                          <div className={styles.alertContent}>
                            <div className={styles.alertTitle}>Condition</div>
                            <div className={styles.alertSub}>Hypertension</div>
                          </div>
                        </div>
                      )}
                      
                      {summary.has_thyroid && (
                        <div className={`${styles.alertItem} ${styles.alertYellow}`}>
                          <div className={styles.alertIcon}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg></div>
                          <div className={styles.alertContent}>
                            <div className={styles.alertTitle}>Condition</div>
                            <div className={styles.alertSub}>Thyroid</div>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ fontSize: 13, color: '#64748b' }}>No critical alerts recorded.</div>
                  )}

                  {summary.past_surgeries && (
                    <div className={`${styles.alertItem} ${styles.alertBlue}`}>
                      <div className={styles.alertIcon}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg></div>
                      <div className={styles.alertContent}>
                        <div className={styles.alertTitle}>Past Surgeries</div>
                        <div className={styles.alertSub}>{summary.past_surgeries}</div>
                      </div>
                    </div>
                  )}

                  <div style={{ color: '#3b82f6', fontSize: 13, fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, cursor: 'pointer' }}>
                    View Full History
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                  </div>
                </div>

                {/* Admission Summary Sidebar */}
                <div className={styles.alertCard}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 800, color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
                    ADMISSION SUMMARY
                  </div>
                  
                  <div className={styles.summaryList}>
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryLabel}>Admission Type</span>
                      <span className={styles.summaryValue}>{summary.admissionCategory || 'IPD'}</span>
                    </div>
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryLabel}>Source</span>
                      <span className={styles.summaryValue}>{summary.admission_type || 'OPD'}</span>
                    </div>
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryLabel}>Attending Doctor</span>
                      <span className={styles.summaryValue}>{summary.doctor ? `Dr. ${summary.doctor}` : 'Not Selected'}</span>
                    </div>
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryLabel}>Admission Date &amp; Time</span>
                      <span className={styles.summaryValue}>{summary.date_admission ? new Date(summary.date_admission).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : 'Not Selected'}</span>
                    </div>
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryLabel}>Triage / Severity</span>
                      <div style={{ marginTop: 4 }}>
                        <span className={`${styles.triageBtn} ${summary.severity ? styles.active : ""} ${summary.severity ? styles[summary.severity.toLowerCase()] : styles.mild}`} style={{ padding: '2px 8px', fontSize: 11 }}>
                          {summary.severity || 'MILD'}
                        </span>
                      </div>
                    </div>
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryLabel}>Ward / Bed</span>
                      <span className={styles.summaryValue}>{(summary.ward || summary.bed) ? `${summary.ward || 'Not Assigned'} / ${summary.bed || 'Not Assigned'}` : 'Not Assigned'}</span>
                    </div>
                  </div>

                  <div style={{ color: '#3b82f6', fontSize: 13, fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, cursor: 'pointer' }}>
                    View More Details
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                  </div>
                </div>
              </section>
            )}

          </div>
        </main>

        {/* --- Sticky Bottom Action Bar --- */}
        <div className={styles.stickyBar}>
          <div className={styles.stickyBarInner}>
            <div style={{ marginRight: "auto", display: "flex", gap: 12 }}>
              <button className={styles.btnClearSticky} onClick={handleClear}>
                ️ {isQuickMode ? "Reset" : "Cancel"}
              </button>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button
                type="button"
                className={styles.btnSecondarySticky}
                onClick={() => saveDraft(summary)}
                disabled={isSaving}
              >
                Save Draft
              </button>

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
                  Continue →
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
