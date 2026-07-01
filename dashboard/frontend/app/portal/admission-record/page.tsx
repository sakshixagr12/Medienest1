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

interface ChiefComplaint {
  complaint: string;
  duration: string;
}

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
}

interface Allergy {
  name: string;
  type: "Drug" | "Food" | "Environmental";
  severity: "Mild" | "Moderate" | "Severe";
}

interface SummaryData {
  patientId?: string;
  patientName: string;
  phone: string;
  age: string;
  address?: string;
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
  vitals_resp_rate: string;
  vitals_weight: string;
  vitals_height: string;
  chief_complaints_extended: ChiefComplaint[];
  complaints: string[]; // Keep for legacy
  hpi: string;
  medical_history: string[];
  current_medications: Medication[];
  allergy_details: Allergy[];
  examination_findings: string;
  provisional_diagnosis: string;
  risk_flags: string[];
  infection_control: string;
  findings: string[];
  diagnosis: string;
  final_diagnosis: string;
  investigations: Investigation[];
  treatment_plan: any[];
  additional_notes: string;
  diet_instructions: string;
  activity_restrictions: string;
  nursing_instructions: string;
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
                <select
                  className={`${styles.statusBadge} ${test.status === "Pending" ? styles.statusPending : styles.statusCompleted}`}
                  value={test.status}
                  onChange={(e) => {
                    const next = [...items];
                    next[idx].status = e.target.value;
                    updateField(field, next);
                  }}
                  style={{
                    appearance: "none",
                    WebkitAppearance: "none",
                    MozAppearance: "none",
                    cursor: "pointer",
                    outline: "none",
                    paddingRight: "20px",
                    backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='${test.status === "Pending" ? "%2392400e" : "%23065f46"}' height='24' viewBox='0 0 24 24' width='24' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/></svg>")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 2px center",
                    backgroundSize: "16px 16px",
                  }}
                >
                  <option value="Pending">Pending</option>
                  <option value="Completed">Completed</option>
                </select>
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

const calculateBMI = (weight: string, height: string): string => {
  const w = parseFloat(weight);
  const h = parseFloat(height) / 100; // cm to m
  if (w > 0 && h > 0) {
    return (w / (h * h)).toFixed(1);
  }
  return "";
};

const MultiSelectChips = ({ options, selected, onChange, allowCustom = false, customLabel = "Add custom...", activeColor = "#f1f5f9", activeTextColor = "#334155", activeBorderColor = "#cbd5e1" }: any) => {
  const [customVal, setCustomVal] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const toggle = (opt: string) => {
    if (selected.includes(opt)) onChange(selected.filter((o: string) => o !== opt));
    else onChange([...selected, opt]);
  };

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {options.map((opt: string) => {
        const isSelected = selected.includes(opt);
        return (
          <button
            key={opt}
            onClick={() => toggle(opt)}
            className={`${styles.chipSelectable}`}
            style={isSelected ? { 
              background: activeColor, 
              color: activeTextColor, 
              borderColor: activeBorderColor, 
              boxShadow: `inset 0 0 0 1px ${activeBorderColor}` 
            } : {}}
          >
            {opt}
          </button>
        );
      })}
      {allowCustom && selected.filter((o: string) => !options.includes(o)).map((opt: string) => (
         <button
          key={opt}
          onClick={() => toggle(opt)}
          className={`${styles.chipSelectable}`}
          style={{ 
            background: activeColor, 
            color: activeTextColor, 
            borderColor: activeBorderColor, 
            boxShadow: `inset 0 0 0 1px ${activeBorderColor}` 
          }}
        >
          {opt} ✕
        </button>
      ))}
      {allowCustom && !isAdding && (
        <button 
          className={styles.chipAddCustom}
          onClick={() => {
            setIsAdding(true);
            setTimeout(() => inputRef.current?.focus(), 50);
          }}
        >
          {customLabel}
        </button>
      )}
      {allowCustom && isAdding && (
        <input
          ref={inputRef}
          placeholder="Type and press Enter..."
          value={customVal}
          onChange={(e) => setCustomVal(e.target.value)}
          onBlur={() => {
            if (!customVal.trim()) setIsAdding(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && customVal.trim()) {
              e.preventDefault();
              if (!selected.includes(customVal.trim())) onChange([...selected, customVal.trim()]);
              setCustomVal("");
              setIsAdding(false);
            } else if (e.key === "Escape") {
              setCustomVal("");
              setIsAdding(false);
            }
          }}
          style={{ padding: "6px 12px", borderRadius: 20, border: "1px dashed #cbd5e1", fontSize: 13, outline: "none", width: 180, boxSizing: "border-box" }}
        />
      )}
    </div>
  );
};

const MedicationRepeater = ({ items, onChange }: any) => {
  const addMed = () => onChange([...items, { name: "", dosage: "", frequency: "" }]);
  const removeMed = (idx: number) => onChange(items.filter((_: any, i: number) => i !== idx));
  const updateMed = (idx: number, field: string, val: string) => {
    const next = [...items];
    next[idx][field] = val;
    onChange(next);
  };
  return (
    <div className={styles.repeaterTable}>
      {items.length > 0 && (
        <div className={styles.repeaterHeaderRow}>
          <div>Medication Name</div>
          <div>Dosage</div>
          <div>Frequency</div>
          <div></div>
        </div>
      )}
      {items.map((med: any, i: number) => (
        <div key={i} className={styles.repeaterTableRow}>
          <div className={styles.iconInputWrapper}>
            <div className={styles.iconInputIcon}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><path d="M10.5 20.5l-6-6a4.5 4.5 0 0 1 6.5-6.5l6 6a4.5 4.5 0 0 1-6.5 6.5z"/><path d="M14 6l4 4"/><path d="M7 13l4 4"/></svg></div>
            <input className={styles.iconInput} placeholder="e.g. Paracetamol" value={med.name} onChange={(e) => updateMed(i, "name", e.target.value)} />
          </div>
          <input className={styles.iconInput} style={{ paddingLeft: 12 }} placeholder="500mg" value={med.dosage} onChange={(e) => updateMed(i, "dosage", e.target.value)} />
          <input className={styles.iconInput} style={{ paddingLeft: 12 }} placeholder="BID" value={med.frequency} onChange={(e) => updateMed(i, "frequency", e.target.value)} />
          <button onClick={() => removeMed(i)} style={{ color: "#ef4444", background: "none", border: "none", cursor: "pointer", padding: "0 8px" }}>✕</button>
        </div>
      ))}
      <button onClick={addMed} className={styles.btnActionAddMed} style={{ alignSelf: "flex-start", marginTop: 4 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add Medication
      </button>
    </div>
  );
};

const ChiefComplaintRepeater = ({ items, onChange }: any) => {
  const addCC = () => onChange([...items, { complaint: "", duration: "" }]);
  const removeCC = (idx: number) => onChange(items.filter((_: any, i: number) => i !== idx));
  const updateCC = (idx: number, field: string, val: string) => {
    const next = [...items];
    next[idx][field] = val;
    onChange(next);
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {items.map((cc: any, i: number) => (
        <div key={i} style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div className={styles.iconInputWrapper} style={{ flex: 2 }}>
            <div className={styles.iconInputIcon}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>
            <input className={styles.iconInput} placeholder="Chief Complaint (e.g. Fever)" value={cc.complaint} onChange={(e) => updateCC(i, "complaint", e.target.value)} />
          </div>
          <div className={styles.iconInputWrapper} style={{ flex: 1 }}>
            <div className={styles.iconInputIcon}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
            <input className={styles.iconInput} placeholder="Duration (e.g. 5 days)" value={cc.duration} onChange={(e) => updateCC(i, "duration", e.target.value)} />
          </div>
          <button onClick={() => removeCC(i)} style={{ color: "#ef4444", background: "none", border: "none", cursor: "pointer", padding: "0 8px", width: 40 }}>✕</button>
        </div>
      ))}
      <button onClick={addCC} className={styles.btnActionAddMed} style={{ color: "#6366f1", alignSelf: "flex-start", marginTop: 4 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add Complaint
      </button>
    </div>
  );
};

const AllergyRepeater = ({ items, onChange }: any) => {
  const addAllergy = () => onChange([...items, { name: "", type: "Drug", severity: "Mild" }]);
  const removeAllergy = (idx: number) => onChange(items.filter((_: any, i: number) => i !== idx));
  const updateAllergy = (idx: number, field: string, val: string) => {
    const next = [...items];
    next[idx][field] = val;
    onChange(next);
  };
  return (
    <div className={styles.repeaterTable}>
      {items.length > 0 && (
        <div className={styles.repeaterHeaderRowAllergy}>
          <div>Allergen</div>
          <div>Type</div>
          <div>Severity</div>
          <div></div>
        </div>
      )}
      {items.map((al: any, i: number) => (
        <div key={i} className={styles.repeaterTableRowAllergy}>
          <div className={styles.iconInputWrapper}>
            <div className={styles.iconInputIcon}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
            <input className={styles.iconInput} placeholder="e.g. Penicillin" value={al.name} onChange={(e) => updateAllergy(i, "name", e.target.value)} />
          </div>
          <select className={styles.iconInput} style={{ paddingLeft: 12 }} value={al.type} onChange={(e) => updateAllergy(i, "type", e.target.value)}>
            <option value="Drug">Drug</option>
            <option value="Food">Food</option>
            <option value="Environmental">Env.</option>
          </select>
          <select className={styles.iconInput} style={{ paddingLeft: 12 }} value={al.severity} onChange={(e) => updateAllergy(i, "severity", e.target.value)}>
            <option value="Mild">Mild</option>
            <option value="Moderate">Moderate</option>
            <option value="Severe">Severe</option>
          </select>
          <button onClick={() => removeAllergy(i)} style={{ color: "#ef4444", background: "none", border: "none", cursor: "pointer", padding: "0 8px" }}>✕</button>
        </div>
      ))}
      <button onClick={addAllergy} className={styles.btnActionAddAllergy} style={{ alignSelf: "flex-start", marginTop: 4 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add Allergy
      </button>
    </div>
  );
};

const TreatmentPlanRepeater = ({ items, onChange }: any) => {
  const addMedication = () => { onChange([...items, { name: "", dosage: "", frequency: "" }]); };
  const addIVFluid = () => { onChange([...items, { name: "IV Fluid (e.g. Normal Saline)", dosage: "500ml", frequency: "Stat" }]); };
  const addMonitoring = () => { onChange([...items, { name: "Monitor Vitals", dosage: "N/A", frequency: "Every 4 hours" }]); };
  
  const removeMed = (idx: number) => onChange(items.filter((_: any, i: number) => i !== idx));
  const updateMed = (idx: number, field: string, val: string) => {
    const next = [...items];
    next[idx][field] = val;
    onChange(next);
  };

  if (items.length === 0) {
    return (
      <div className={styles.emptyTreatmentState}>
        <div className={styles.emptyTreatmentIcon}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
        </div>
        <div className={styles.emptyTreatmentMessage}>No treatment items added yet</div>
        <div className={styles.emptyTreatmentSub}>Select a quick action to start building the treatment plan.</div>
        <div className={styles.quickActionGrid}>
          <button onClick={addMedication} className={styles.quickActionBtn}>
             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.5 20.5l-6-6a4.5 4.5 0 0 1 6.5-6.5l6 6a4.5 4.5 0 0 1-6.5 6.5z"/><path d="M14 6l4 4"/><path d="M7 13l4 4"/></svg>
             Add Medication
          </button>
          <button onClick={addIVFluid} className={styles.quickActionBtn}>
             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
             Add IV Fluid
          </button>
          <button onClick={addMonitoring} className={styles.quickActionBtn}>
             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
             Add Monitoring
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.repeaterTable}>
      <div className={styles.repeaterHeaderRow}>
        <div>Treatment Item</div>
        <div>Dosage / Details</div>
        <div>Frequency</div>
        <div></div>
      </div>
      {items.map((med: any, i: number) => (
        <div key={i} className={styles.repeaterTableRow}>
          <div className={styles.iconInputWrapper}>
            <div className={styles.iconInputIcon}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><path d="M10.5 20.5l-6-6a4.5 4.5 0 0 1 6.5-6.5l6 6a4.5 4.5 0 0 1-6.5 6.5z"/><path d="M14 6l4 4"/><path d="M7 13l4 4"/></svg></div>
            <input className={styles.iconInput} placeholder="e.g. Paracetamol" value={med.name} onChange={(e) => updateMed(i, "name", e.target.value)} />
          </div>
          <input className={styles.iconInput} style={{ paddingLeft: 12 }} placeholder="500mg" value={med.dosage} onChange={(e) => updateMed(i, "dosage", e.target.value)} />
          <input className={styles.iconInput} style={{ paddingLeft: 12 }} placeholder="BID" value={med.frequency} onChange={(e) => updateMed(i, "frequency", e.target.value)} />
          <button onClick={() => removeMed(i)} style={{ color: "#ef4444", background: "none", border: "none", cursor: "pointer", padding: "0 8px" }}>✕</button>
        </div>
      ))}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16, flexWrap: "wrap", paddingLeft: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginRight: 4 }}>Quick Add</span>
        <button onClick={addMedication} className={styles.quickActionBtn} style={{ padding: "6px 14px", fontSize: 12, borderRadius: 100, border: "1.5px solid #e2e8f0" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><path d="M10.5 20.5l-6-6a4.5 4.5 0 0 1 6.5-6.5l6 6a4.5 4.5 0 0 1-6.5 6.5z"/><path d="M14 6l4 4"/><path d="M7 13l4 4"/></svg>
          Medication
        </button>
        <button onClick={addIVFluid} className={styles.quickActionBtn} style={{ padding: "6px 14px", fontSize: 12, borderRadius: 100, border: "1.5px solid #e2e8f0" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          IV Fluid
        </button>
        <button onClick={addMonitoring} className={styles.quickActionBtn} style={{ padding: "6px 14px", fontSize: 12, borderRadius: 100, border: "1.5px solid #e2e8f0" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          Monitoring
        </button>
      </div>
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
    vitals_resp_rate: "",
    vitals_weight: "",
    vitals_height: "",
    diagnosis: "",
    provisional_diagnosis: "",
    final_diagnosis: "",
    hpi: "",
    complaints: [],
    chief_complaints_extended: [],
    medical_history: [],
    current_medications: [],
    allergy_details: [],
    examination_findings: "",
    risk_flags: [],
    infection_control: "None",
    findings: [],
    investigations: [],
    treatment_plan: [],
    additional_notes: "",
    diet_instructions: "",
    activity_restrictions: "",
    nursing_instructions: "",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [clinicLoading, setClinicLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [finalizePatientId, setFinalizePatientId] = useState<string | null>(null);
  const [finalizeRecordId, setFinalizeRecordId] = useState<string | null>(null);

  const [isInitialized, setIsInitialized] = useState(false);

  const [activeAdmissionId, setActiveAdmissionId] = useState<string | null>(null);

  const [patientHistoryData, setPatientHistoryData] = useState<{
    isLoading: boolean;
    isNewPatient: boolean;
    pastAdmissionsCount: number;
    lastDischargeDate: string | null;
    allergies: string;
    chronicDiseases: string[];
    pastSurgeries: string;
  }>({
    isLoading: true,
    isNewPatient: true,
    pastAdmissionsCount: 0,
    lastDischargeDate: null,
    allergies: "",
    chronicDiseases: [],
    pastSurgeries: "",
  });

  useEffect(() => {
    const pId = searchParams.get("patientId");
    const dId = searchParams.get("draftId");
    if (pId && !dId) {
      const checkActive = async () => {
        const { data } = await supabase
          .from("admission_records")
          .select("id")
          .eq("patient_id", pId)
          .eq("status", "Admitted")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data?.id) {
          setActiveAdmissionId(data.id);
        }
      };
      checkActive();
    }
  }, [searchParams]);

  // 1. Initial Load: Restore from URL or LocalStorage
  useEffect(() => {
    const urlStep = searchParams.get("step");
    const localStep = localStorage.getItem("admission_draft_step");
    
    let resolvedStep = 1;
    if (urlStep && !isNaN(parseInt(urlStep))) {
      resolvedStep = parseInt(urlStep);
    } else if (localStep && !isNaN(parseInt(localStep))) {
      resolvedStep = parseInt(localStep);
    }

    setStep(resolvedStep);
    localStorage.setItem("admission_draft_step", resolvedStep.toString());
    setIsInitialized(true);

    const params = new URLSearchParams(searchParams.toString());
    if (params.get("step") !== resolvedStep.toString()) {
      params.set("step", resolvedStep.toString());
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  }, []); // Run ONLY on mount

  // 2. Sync URL changes to State (e.g. Browser Back/Forward)
  useEffect(() => {
    if (!isInitialized) return;
    const urlStep = searchParams.get("step");
    if (urlStep && !isNaN(parseInt(urlStep))) {
      const parsed = parseInt(urlStep);
      setStep(prev => {
        if (prev !== parsed) {
          localStorage.setItem("admission_draft_step", parsed.toString());
          return parsed;
        }
        return prev;
      });
    }
  }, [searchParams, isInitialized]);

  // 3. Sync State changes to URL and LocalStorage (e.g. Next/Prev buttons)
  useEffect(() => {
    if (!isInitialized) return;
    localStorage.setItem("admission_draft_step", step.toString());
    const currentUrlStep = searchParams.get("step");
    if (currentUrlStep !== step.toString()) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("step", step.toString());
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  }, [step, isInitialized, router, searchParams]);

  const handleSetStep = useCallback((newStepVal: number | ((s: number) => number)) => {
    setStep((prev) => {
      return typeof newStepVal === "function" ? newStepVal(prev) : newStepVal;
    });
  }, []);
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

  // --- Smart Patient Search States ---
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isNewPatientMode, setIsNewPatientMode] = useState(false);
  const [focusedResultIndex, setFocusedResultIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!searchTerm.trim() || isNewPatientMode || summary.patientId) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const query = searchTerm.trim();
        let dbQuery = supabase
          .from("patients")
          .select("*")
          .or(`name.ilike.%${query}%,contact.ilike.%${query}%`);
          
        if (clinic?.id) {
          dbQuery = dbQuery.eq("clinic_id", clinic.id);
        }

        const { data } = await dbQuery.limit(5);

        if (data) {
          setSearchResults(data);
          setShowDropdown(true);
        } else {
          setSearchResults([]);
        }
      } catch (err) {
        console.error("Error searching patients:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, isNewPatientMode, summary.patientId, clinic?.id]);

  const handleSelectPatient = (patient: any) => {
    const ageStr = patient.age_sex ? patient.age_sex.split(" / ")[0] : "";
    const sexStr = patient.age_sex ? patient.age_sex.split(" / ")[1] : "Male";
    
    // Parse chronic diseases from history array
    const hasDiabetes = patient.history?.includes("Diabetes") || false;
    const hasHypertension = patient.history?.includes("Hypertension") || false;
    const hasThyroid = patient.history?.includes("Thyroid") || false;
    
    setSummary(prev => ({
      ...prev,
      patientId: patient.id,
      patientName: patient.name || "",
      age: ageStr,
      sex: sexStr,
      phone: patient.contact || "",
      address: patient.address || "",
      allergies: patient.allergies || "",
      has_diabetes: hasDiabetes,
      has_hypertension: hasHypertension,
      has_thyroid: hasThyroid,
      past_surgeries: patient.past_surgeries || "",
      department: patient.department || "",
      doctor: patient.primary_consultant || "",
    }));
    
    setSearchTerm("");
    setShowDropdown(false);
  };

  const suggestTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const draftId = searchParams.get("draftId");
    
    if (draftId) {
      const fetchDraft = async () => {
        const { data } = await supabase.from("admission_records").select("*").eq("id", draftId).single();
        if (data) {
          // Parse complex fields if they are JSON strings, or use directly if objects
          const safeParse = (val: any) => {
            if (typeof val === "string") {
              try { return JSON.parse(val); } catch (e) { return []; }
            }
            return Array.isArray(val) ? val : [];
          };

          const newSummary = {
            patientName: data.patient_name || "",
            age: data.age_sex ? data.age_sex.split(" / ")[0] : "",
            sex: data.age_sex ? data.age_sex.split(" / ")[1] : "",
            phone: data.contact || "",
            doctor: data.doctor_name || "",
            ward: data.ward || "",
            bed: data.bed || "",
            department: data.department || "",
            date_admission: data.date_admission ? new Date(new Date(data.date_admission).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
            severity: data.severity || "Mild",
            admission_type: data.admission_type || "OPD",
            doctor_observations: data.doctor_observations || "",
            attachments: safeParse(data.attachments),
            vitals: data.vitals || "",
            vitals_bp_sys: data.vitals_bp_sys ? data.vitals_bp_sys.toString() : "",
            vitals_bp_dia: data.vitals_bp_dia ? data.vitals_bp_dia.toString() : "",
            vitals_pulse: data.vitals_pulse ? data.vitals_pulse.toString() : "",
            vitals_temp: data.vitals_temp ? data.vitals_temp.toString() : "",
            vitals_spo2: data.vitals_spo2 ? data.vitals_spo2.toString() : "",
            has_diabetes: !!data.has_diabetes,
            has_hypertension: !!data.has_hypertension,
            has_thyroid: !!data.has_thyroid,
            past_surgeries: data.past_surgeries || "",
            allergies: data.allergies || "",
            diagnosis: data.diagnosis || "",
            final_diagnosis: data.final_diagnosis || "",
            hpi: data.hpi || "",
            complaints: safeParse(data.complaints),
            findings: safeParse(data.findings),
            investigations: safeParse(data.investigations),
            treatment_plan: safeParse(data.treatment_plan),
            vitals_resp_rate: "",
            vitals_weight: "",
            vitals_height: "",
            provisional_diagnosis: "",
            chief_complaints_extended: [],
            medical_history: [],
            current_medications: [],
            allergy_details: [],
            examination_findings: "",
            risk_flags: [],
            infection_control: "None",
            additional_notes: "",
            diet_instructions: "",
            activity_restrictions: "",
            nursing_instructions: "",
          };
          setSummary((prev) => ({ ...prev, ...newSummary }));

          if (data.patient_id) {
            let admissionsCount = 0;
            let lastDischarge = null;
            const { data: records } = await supabase
              .from("admission_records")
              .select("status, updated_at")
              .eq("patient_id", data.patient_id)
              .order("created_at", { ascending: false });

            if (records && records.length > 0) {
               admissionsCount = records.length;
               const dischargedRecords = records.filter((r: any) => r.status === "Discharged");
               if (dischargedRecords.length > 0) {
                 lastDischarge = dischargedRecords[0].updated_at;
               }
            }

            const chronic: string[] = [];
            if (data.has_diabetes) chronic.push("Diabetes");
            if (data.has_hypertension) chronic.push("Hypertension");
            if (data.has_thyroid) chronic.push("Thyroid");

            setPatientHistoryData({
              isLoading: false,
              isNewPatient: admissionsCount === 0 && !data.allergies?.trim() && !data.past_surgeries?.trim() && chronic.length === 0,
              pastAdmissionsCount: admissionsCount,
              lastDischargeDate: lastDischarge,
              allergies: data.allergies || "",
              chronicDiseases: chronic,
              pastSurgeries: data.past_surgeries || "",
            });
          } else {
            setPatientHistoryData(prev => ({ ...prev, isLoading: false }));
          }
        } else {
          setPatientHistoryData(prev => ({ ...prev, isLoading: false }));
        }
      };
      fetchDraft();
    } else {
      const pId = searchParams.get("patientId");
      const isNew = searchParams.get("new") === "true";
      
      const loadDraftOrFresh = async () => {
        let draftToLoad: any = null;
        
        if (isNew) {
          localStorage.removeItem("admission_draft");
          localStorage.removeItem("admission_draft_step");
          handleSetStep(1);
        } else {
          const draftStr = localStorage.getItem("admission_draft");
          if (draftStr) {
            try {
              draftToLoad = JSON.parse(draftStr);
            } catch (e) {
              console.error("Draft error", e);
            }
          }
        }
        
        if (!draftToLoad) {
          const d = new Date();
          d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
          setSummary((prev) => ({ ...prev, date_admission: d.toISOString().slice(0, 16) }));
        }

        if (pId) {
          const { data: patient } = await supabase.from("patients").select("*").eq("id", pId).single();
          if (patient) {
            // Check if draft belongs to someone else
            if (draftToLoad && draftToLoad.patientName && draftToLoad.patientName !== patient.name) {
               draftToLoad = null;
               localStorage.removeItem("admission_draft");
               localStorage.removeItem("admission_draft_step");
               handleSetStep(1);
            }
            
            setSummary(prev => ({
              ...prev,
              ...(draftToLoad || {}),
              patientName: patient.name,
              phone: patient.contact || "",
              age: patient.age ? patient.age.toString() : "",
              sex: patient.gender || "Male",
              has_diabetes: !!patient.has_diabetes,
              has_hypertension: !!patient.has_hypertension,
              has_thyroid: !!patient.has_thyroid,
              allergies: patient.allergies || "",
              past_surgeries: patient.past_surgeries || "",
              doctor: docNameParam || (doctors && doctors.length > 0 ? doctors[0].name : prev.doctor)
            }));
            setClinicLoading(false);
            
            // FETCH HISTORY
            let admissionsCount = 0;
            let lastDischarge = null;
            const { data: records } = await supabase
              .from("admission_records")
              .select("status, updated_at")
              .eq("patient_id", pId)
              .order("created_at", { ascending: false });

            if (records && records.length > 0) {
               admissionsCount = records.length;
               const dischargedRecords = records.filter((r: any) => r.status === "Discharged");
               if (dischargedRecords.length > 0) {
                 lastDischarge = dischargedRecords[0].updated_at;
               }
            }

            const chronic: string[] = [];
            if (patient.has_diabetes) chronic.push("Diabetes");
            if (patient.has_hypertension) chronic.push("Hypertension");
            if (patient.has_thyroid) chronic.push("Thyroid");

            setPatientHistoryData({
              isLoading: false,
              isNewPatient: admissionsCount === 0 && !patient.allergies?.trim() && !patient.past_surgeries?.trim() && chronic.length === 0,
              pastAdmissionsCount: admissionsCount,
              lastDischargeDate: lastDischarge,
              allergies: patient.allergies || "",
              chronicDiseases: chronic,
              pastSurgeries: patient.past_surgeries || "",
            });
            return;
          }
        }
        setPatientHistoryData(prev => ({ ...prev, isLoading: false }));

        // If no patientId or patient fetch failed, use draft or fresh
        if (draftToLoad) {
          setSummary((prev) => ({
            ...prev,
            ...draftToLoad,
            ward: draftToLoad.ward || "",
            bed: draftToLoad.bed || "",
            department: draftToLoad.department || "",
            diagnosis: draftToLoad.diagnosis || "",
            hpi: draftToLoad.hpi || "",
            has_diabetes: !!draftToLoad.has_diabetes,
            has_hypertension: !!draftToLoad.has_hypertension,
            has_thyroid: !!draftToLoad.has_thyroid,
            past_surgeries: draftToLoad.past_surgeries || "",
            allergies: draftToLoad.allergies || "",
            severity: draftToLoad.severity || "Mild",
            admission_type: draftToLoad.admission_type || "OPD",
            doctor_observations: draftToLoad.doctor_observations || "",
            attachments: draftToLoad.attachments || [],
            vitals: draftToLoad.vitals || "",
            vitals_bp_sys: draftToLoad.vitals_bp_sys || "",
            vitals_bp_dia: draftToLoad.vitals_bp_dia || "",
            vitals_pulse: draftToLoad.vitals_pulse || "",
            vitals_temp: draftToLoad.vitals_temp || "",
            final_diagnosis: draftToLoad.final_diagnosis || "",
            provisional_diagnosis: draftToLoad.provisional_diagnosis || "",
            vitals_resp_rate: draftToLoad.vitals_resp_rate || "",
            vitals_weight: draftToLoad.vitals_weight || "",
            vitals_height: draftToLoad.vitals_height || "",
            chief_complaints_extended: draftToLoad.chief_complaints_extended || [],
            medical_history: draftToLoad.medical_history || [],
            current_medications: draftToLoad.current_medications || [],
            allergy_details: draftToLoad.allergy_details || [],
            examination_findings: draftToLoad.examination_findings || "",
            risk_flags: draftToLoad.risk_flags || [],
            infection_control: draftToLoad.infection_control || "None",
            investigations: Array.isArray(draftToLoad.investigations)
              ? draftToLoad.investigations.map((inv: any) =>
                  typeof inv === "string" ? { name: inv, status: "Pending" } : inv
                )
              : [],
            additional_notes: draftToLoad.additional_notes || "",
            diet_instructions: draftToLoad.diet_instructions || "",
            activity_restrictions: draftToLoad.activity_restrictions || "",
            nursing_instructions: draftToLoad.nursing_instructions || "",
          }));
        } else {
          if (docNameParam) {
            setSummary((prev) => ({ ...prev, doctor: docNameParam }));
          } else if (doctors && doctors.length > 0) {
            setSummary((prev) => ({ ...prev, doctor: doctors[0].name }));
          }
        }
        setClinicLoading(false);
      };
      loadDraftOrFresh();
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
    let required = ["patientName", "doctor", "ward", "bed", "date_admission"];
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
      let patientId: string | null = searchParams.get("patientId");

      if (!patientId && clinic?.id) {
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
        if (!existingPatient && summary.patientName) {
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
        } else if (summary.patientName) {
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

      const combinedObservations = [
        summary.doctor_observations,
        summary.diet_instructions ? `Diet: ${summary.diet_instructions}` : "",
        summary.activity_restrictions ? `Activity: ${summary.activity_restrictions}` : "",
        summary.nursing_instructions ? `Nursing: ${summary.nursing_instructions}` : ""
      ].filter(Boolean).join("\n\n");

      const admissionData = {
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
        doctor_observations: combinedObservations,
        attachments: summary.attachments,
        vitals: summary.vitals,
        vitals_bp_sys: summary.vitals_bp_sys ? parseInt(summary.vitals_bp_sys) : null,
        vitals_bp_dia: summary.vitals_bp_dia ? parseInt(summary.vitals_bp_dia) : null,
        vitals_pulse: summary.vitals_pulse ? parseInt(summary.vitals_pulse) : null,
        vitals_temp: summary.vitals_temp ? parseFloat(summary.vitals_temp) : null,
        vitals_spo2: summary.vitals_spo2 ? parseInt(summary.vitals_spo2) : null,
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
        status: 'Admitted'
      };

      let insertedRecord = null;
      let error = null;

      if (activeAdmissionId) {
        const { data, error: updateError } = await supabase.from("admission_records").update(admissionData).eq("id", activeAdmissionId).select("id").single();
        insertedRecord = data;
        error = updateError;
      } else {
        const { data, error: insertError } = await supabase.from("admission_records").insert([admissionData]).select("id").single();
        insertedRecord = data;
        error = insertError;
      }

      if (error) throw error;
      localStorage.removeItem("admission_draft");
      localStorage.removeItem("admission_draft_step");
      setFinalizePatientId(patientId);
      setFinalizeRecordId(insertedRecord?.id || null);
      setShowFinalizeModal(true);
    } catch (e: any) {
      alert("Error saving: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem("admission_draft", JSON.stringify(summary));
      localStorage.setItem("admission_draft_step", step.toString());
      
      // Also save to database if we have enough patient context
      let patientId: string | null = searchParams.get("patientId");
      if (!patientId && clinic?.id) {
        let existingPatient = null;
        if (summary.phone) {
          const { data } = await supabase.from("patients").select("id").eq("contact", summary.phone).eq("clinic_id", clinic.id).maybeSingle();
          if (data) existingPatient = data;
        }
        if (!existingPatient && summary.patientName) {
          const { data } = await supabase.from("patients").select("id").eq("name", summary.patientName).eq("clinic_id", clinic.id).limit(1).maybeSingle();
          if (data) existingPatient = data;
        }

        if (existingPatient?.id) {
          patientId = existingPatient.id;
        } else if (summary.patientName) {
          // Create patient stub so they appear in Patient Directory and Hub
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

      if (patientId || summary.patientName) {
        const combinedObservations = [
          summary.doctor_observations,
          summary.diet_instructions ? `Diet: ${summary.diet_instructions}` : "",
          summary.activity_restrictions ? `Activity: ${summary.activity_restrictions}` : "",
          summary.nursing_instructions ? `Nursing: ${summary.nursing_instructions}` : ""
        ].filter(Boolean).join("\n\n");

        const admissionData = {
          patient_name: summary.patientName || "Draft Patient",
          age_sex: `${summary.age} / ${summary.sex}`,
          contact: summary.phone,
          doctor_name: summary.doctor,
          ward: summary.ward,
          bed: summary.bed,
          department: summary.department,
          date_admission: summary.date_admission ? new Date(summary.date_admission).toISOString() : new Date().toISOString(),
          severity: summary.severity,
          admission_type: summary.admission_type,
          doctor_observations: combinedObservations,
          attachments: summary.attachments,
          vitals: summary.vitals,
          vitals_bp_sys: summary.vitals_bp_sys ? parseInt(summary.vitals_bp_sys) : null,
          vitals_bp_dia: summary.vitals_bp_dia ? parseInt(summary.vitals_bp_dia) : null,
          vitals_pulse: summary.vitals_pulse ? parseInt(summary.vitals_pulse) : null,
          vitals_temp: summary.vitals_temp ? parseFloat(summary.vitals_temp) : null,
          vitals_spo2: summary.vitals_spo2 ? parseInt(summary.vitals_spo2) : null,
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
          status: 'Draft'
        };

        if (activeAdmissionId) {
          await supabase.from("admission_records").update(admissionData).eq("id", activeAdmissionId);
        } else {
          await supabase.from("admission_records").insert([admissionData]);
        }
      }
    } catch (e) {
      console.error("Failed to save draft", e);
    } finally {
      setIsSaving(false);
      setShowDraftModal(true);
    }
  };

  const handleDraftContinue = () => {
    setShowDraftModal(false);
  };

  const handleBack = () => {
    if (window.history.length > 2) {
      router.back();
    } else {
      const patientIdParam = searchParams?.get("patientId");
      if (patientIdParam) {
        router.push(`/portal/doctor-dashboard/patients/${patientIdParam}?tab=Admissions`);
      } else {
        router.push(`/portal/doctor-dashboard`);
      }
    }
  };

  const handleDraftDashboard = () => {
    handleBack();
  };

  const handleDraftStartNew = () => {
    const draftId = Date.now();
    localStorage.setItem(`admission_draft_${draftId}`, JSON.stringify(summary));
    
    // Clear current active draft
    localStorage.removeItem("admission_draft");
    localStorage.removeItem("admission_draft_step");
    
    // Reset state
    setSummary({
      patientName: "", phone: "", age: "", sex: "Male", doctor: "", ward: "", bed: "", department: "",
      date_admission: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16), severity: "Mild", admission_type: "OPD",
      has_diabetes: false, has_hypertension: false, has_thyroid: false, past_surgeries: "", allergies: "",
      doctor_observations: "", attachments: [], vitals: "", vitals_bp_sys: "", vitals_bp_dia: "",
      vitals_pulse: "", vitals_temp: "", vitals_spo2: "", vitals_resp_rate: "", vitals_weight: "", vitals_height: "",
      diagnosis: "", provisional_diagnosis: "", final_diagnosis: "", hpi: "", complaints: [], chief_complaints_extended: [],
      medical_history: [], current_medications: [], allergy_details: [], examination_findings: "", risk_flags: [],
      infection_control: "None", findings: [], investigations: [], treatment_plan: [], additional_notes: "",
      diet_instructions: "", activity_restrictions: "", nursing_instructions: "",
    });
    setStep(1);
    setShowDraftModal(false);
  };

  const handleClear = async () => {
    if (
      await confirm(
        "Are you sure you want to clear all records? This will delete the current draft.",
      )
    ) {
      setSummary({
        patientName: "", phone: "", age: "", sex: "Male", doctor: "", ward: "", bed: "", department: "",
        date_admission: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16), severity: "Mild", admission_type: "OPD",
        has_diabetes: false, has_hypertension: false, has_thyroid: false, past_surgeries: "", allergies: "",
        doctor_observations: "", attachments: [], vitals: "", vitals_bp_sys: "", vitals_bp_dia: "",
        vitals_pulse: "", vitals_temp: "", vitals_spo2: "", vitals_resp_rate: "", vitals_weight: "", vitals_height: "",
        diagnosis: "", provisional_diagnosis: "", final_diagnosis: "", hpi: "", complaints: [], chief_complaints_extended: [],
        medical_history: [], current_medications: [], allergy_details: [], examination_findings: "", risk_flags: [],
        infection_control: "None", findings: [], investigations: [], treatment_plan: [], additional_notes: "",
        diet_instructions: "", activity_restrictions: "", nursing_instructions: "",
      });
      localStorage.removeItem("admission_draft");
      localStorage.removeItem("admission_draft_step");
      setLastSaved(null);
      showToast("Records cleared");
      handleSetStep(1);
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
                  onClick={() => handleSetStep(s.id)}
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
        id={field}
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

  const handleNextStep = () => {
    // Validation removed as per user request to not make fields mandatory for next step
    handleSetStep((s) => s + 1);
  };

  if (activeAdmissionId) {
    const dParams = searchParams.get("doctorId") ? `&doctorId=${searchParams.get("doctorId")}&doctorName=${encodeURIComponent(searchParams.get("doctorName") || searchParams.get("docName") || "")}` : "";
    return (
      <div style={{ background: "#f8fafc", minHeight: "100vh" }}>
        <TopBar title="Admission Management" backHref={`/portal/doctor-dashboard${dParams.replace('&', '?')}`} />
        <div style={{ padding: 40, maxWidth: 600, margin: "0 auto", marginTop: 100, background: "#fef2f2", border: "2px solid #ef4444", borderRadius: 12, textAlign: "center", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}>
          <div style={{ background: "#fee2e2", width: 64, height: 64, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", marginBottom: 20 }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
          </div>
          <h2 style={{ color: "#b91c1c", margin: "0 0 16px 0", fontSize: 20 }}>Patient already has an active admission.</h2>
          <p style={{ fontSize: 16, color: "#7f1d1d", margin: "0 0 32px 0" }}>Admission ID: <b style={{ fontFamily: "monospace", fontSize: 18 }}>{activeAdmissionId.slice(0, 8).toUpperCase()}</b></p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
             <button onClick={() => router.push(`/portal/admission-record?draftId=${activeAdmissionId}&patientId=${searchParams.get("patientId")}${dParams}`)} style={{ flex: 1, background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", padding: "12px", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>Continue Admission</button>
             <button onClick={() => router.push(`/portal/discharge-summary?admissionId=${activeAdmissionId}&patientId=${searchParams.get("patientId")}${dParams}`)} style={{ flex: 1, background: "#2563eb", color: "#fff", border: "1px solid #2563eb", padding: "12px", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>Create Discharge</button>
             <button onClick={handleBack} style={{ flex: 1, background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", padding: "12px", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  if (clinicLoading) return null;

  const stateRef = useRef<any>({});
  stateRef.current = { summary, isQuickMode, step, showDropdown, handleFinalSubmit, handleSaveDraft, handleNextStep, updateField };

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const { summary, isQuickMode, step, showDropdown, handleFinalSubmit, handleSaveDraft, handleNextStep, updateField } = stateRef.current;
      
      // Ctrl+S to save draft
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveDraft();
        return;
      }
      
      // Ctrl+Enter to continue/submit
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (isQuickMode) {
          handleFinalSubmit();
        } else if (step < 3) {
          handleNextStep();
        } else {
          handleFinalSubmit();
        }
        return;
      }

      // Enter -> next field
      if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.defaultPrevented) {
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'SELECT')) {
          const focusable = Array.from(document.querySelectorAll('input, select, textarea, button'));
          const index = focusable.indexOf(activeElement);
          if (index > -1 && index < focusable.length - 1) {
             e.preventDefault();
             (focusable[index + 1] as HTMLElement).focus();
             return;
          }
        }
      }
    };
    
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

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
              {(((typeof summary.allergies === 'string' ? summary.allergies : Array.isArray(summary.allergies) ? summary.allergies.join(', ') : "") || "").trim() ||
                summary.has_diabetes ||
                summary.has_hypertension ||
                summary.has_thyroid) && (() => {
                const flags: string[] = [];
                const allergyStr = ((typeof summary.allergies === 'string' ? summary.allergies : Array.isArray(summary.allergies) ? summary.allergies.join(', ') : "") || "").trim();
                if (allergyStr) flags.push(allergyStr);
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
                      const admissionChecklist = step === 1 ? [
                        { label: "Name", value: summary.patientName, field: "patientName" },
                        { label: "Age", value: summary.age, field: "age" },
                        { label: "Phone Number", value: summary.phone, field: "phone" },
                        { label: "Doctor Assigned", value: summary.doctor, field: "doctor" },
                        { label: "Ward", value: summary.ward, field: "ward" },
                        { label: "Bed", value: summary.bed, field: "bed" }
                      ] : step === 2 ? [
                        { label: "Chief Complaint", value: summary.chief_complaints_extended?.length > 0 ? summary.chief_complaints_extended[0].complaint : "", field: "complaints" },
                        { label: "Vitals (Temp)", value: summary.vitals_temp, field: "vitals_temp" },
                        { label: "Vitals (BP)", value: summary.vitals_bp_sys && summary.vitals_bp_dia ? "Done" : "", field: "vitals_bp_sys" },
                        { label: "Vitals (Pulse)", value: summary.vitals_pulse, field: "vitals_pulse" },
                        { label: "Provisional Diagnosis", value: summary.provisional_diagnosis, field: "provisional_diagnosis" }
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

                    {/* --- Alerts & History Panel (Intelligent) --- */}
                    {patientHistoryData.isLoading ? (
                      <div className={styles.progressCard} style={{ borderLeft: "4px solid #cbd5e1", background: "#f8fafc", padding: "16px", marginTop: 0 }}>
                        <div style={{ display: "flex", gap: 7, marginBottom: 16 }}>
                          <div style={{ width: 15, height: 15, background: "#e2e8f0", borderRadius: 4 }}></div>
                          <div style={{ width: 100, height: 15, background: "#e2e8f0", borderRadius: 4 }}></div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                          <div style={{ width: "100%", height: 14, background: "#e2e8f0", borderRadius: 4 }}></div>
                          <div style={{ width: "80%", height: 14, background: "#e2e8f0", borderRadius: 4 }}></div>
                          <div style={{ width: "60%", height: 14, background: "#e2e8f0", borderRadius: 4 }}></div>
                        </div>
                      </div>
                    ) : patientHistoryData.isNewPatient ? (
                      <div className={styles.progressCard} style={{ borderLeft: "4px solid #10b981", background: "#fff", padding: "16px", marginTop: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 16, borderBottom: "1px solid #d1fae5", paddingBottom: 10 }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
                          <span style={{ fontSize: 11, fontWeight: 900, color: "#047857", textTransform: "uppercase", letterSpacing: 0.7 }}>Alerts &amp; History</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "#065f46" }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                          No known alerts. First admission.
                        </div>
                      </div>
                    ) : (
                      <div className={styles.progressCard} style={{ borderLeft: `4px solid ${patientHistoryData.allergies || patientHistoryData.chronicDiseases.length > 0 ? "#ef4444" : "#3b82f6"}`, background: "#fff", padding: "16px", marginTop: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 16, borderBottom: `1px solid ${patientHistoryData.allergies || patientHistoryData.chronicDiseases.length > 0 ? "#fee2e2" : "#bfdbfe"}`, paddingBottom: 10 }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={patientHistoryData.allergies || patientHistoryData.chronicDiseases.length > 0 ? "#ef4444" : "#3b82f6"} strokeWidth="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
                          <span style={{ fontSize: 11, fontWeight: 900, color: patientHistoryData.allergies || patientHistoryData.chronicDiseases.length > 0 ? "#b91c1c" : "#1d4ed8", textTransform: "uppercase", letterSpacing: 0.7 }}>Alerts &amp; History</span>
                        </div>
                        
                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                          <div>
                             <div style={{ fontSize: 10, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
                               Alerts
                             </div>
                             <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                               {!(patientHistoryData.allergies || patientHistoryData.chronicDiseases.length > 0) ? (
                                 <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "#166534" }}>
                                   ✓ No Known Drug Allergies (NKDA)
                                 </div>
                               ) : (
                                 <>
                                   {patientHistoryData.allergies && (
                                     <div style={{ display: "flex", gap: 6, fontSize: 13, fontWeight: 600, color: "#9f1239" }}>
                                       <span style={{ fontSize: 14 }}>🟥</span> <span>Allergies: {patientHistoryData.allergies}</span>
                                     </div>
                                   )}
                                   {patientHistoryData.chronicDiseases.map((disease: any) => (
                                     <div key={disease} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "#92400e" }}>
                                       <span style={{ fontSize: 14 }}>🟨</span> {disease}
                                     </div>
                                   ))}
                                 </>
                               )}
                             </div>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                             <div style={{ background: "#f8fafc", padding: "10px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                               <div style={{ fontSize: 10, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
                                 Past Admissions
                               </div>
                               <div style={{ fontSize: 14, fontWeight: 700, color: "#334155" }}>
                                 {patientHistoryData.pastAdmissionsCount}
                               </div>
                             </div>
                             {patientHistoryData.lastDischargeDate && (
                               <div style={{ background: "#f8fafc", padding: "10px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                                 <div style={{ fontSize: 10, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
                                   Last Discharge
                                 </div>
                                 <div style={{ fontSize: 14, fontWeight: 700, color: "#334155" }}>
                                   {new Date(patientHistoryData.lastDischargeDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                 </div>
                               </div>
                             )}
                          </div>

                          <div style={{ background: "#f8fafc", padding: "10px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                             <div style={{ fontSize: 10, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
                               Past Surgeries
                             </div>
                             <div style={{ fontSize: 14, fontWeight: 700, color: "#334155" }}>
                               {patientHistoryData.pastSurgeries ? patientHistoryData.pastSurgeries : "None"}
                             </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
                {step === 2 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div className={styles.summaryCard}>
                      <div className={styles.cardHeader} style={{ marginBottom: 16 }}>
                        <div className={styles.cardTitle}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                          3. VITAL SIGNS
                        </div>
                        <div className={styles.cardHeaderRequired}>Required</div>
                      </div>
                      <div className={styles.vitalGrid}>
                        <div className="field" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>Temp (°C)</label>
                          <div className={styles.iconInputWrapper}>
                            <div className={styles.iconInputIcon}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg></div>
                            <input className={styles.iconInput} value={summary.vitals_temp} onChange={e => updateField("vitals_temp", e.target.value)} />
                          </div>
                        </div>
                        <div className="field" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>BP (mmHg)</label>
                          <div style={{ display: "flex", gap: 4, width: "100%", alignItems: "center" }}>
                            <input 
                              type="text" 
                              inputMode="numeric"
                              className={styles.iconInput} 
                              placeholder="Sys" 
                              value={summary.vitals_bp_sys} 
                              onChange={e => updateField("vitals_bp_sys", e.target.value)} 
                              style={{ flex: 1, minWidth: 0, width: "100%", padding: "12px 4px", textAlign: "center", boxSizing: "border-box" }} 
                            />
                            <span style={{ color: "#cbd5e1", fontWeight: "bold", flexShrink: 0, fontSize: 16 }}>/</span>
                            <input 
                              type="text" 
                              inputMode="numeric"
                              className={styles.iconInput} 
                              placeholder="Dia" 
                              value={summary.vitals_bp_dia} 
                              onChange={e => updateField("vitals_bp_dia", e.target.value)} 
                              style={{ flex: 1, minWidth: 0, width: "100%", padding: "12px 4px", textAlign: "center", boxSizing: "border-box" }} 
                            />
                          </div>
                        </div>
                        <div className="field" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>Pulse (bpm)</label>
                          <div className={styles.iconInputWrapper}>
                            <div className={styles.iconInputIcon} style={{ color: "#10b981" }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg></div>
                            <input className={styles.iconInput} value={summary.vitals_pulse} onChange={e => updateField("vitals_pulse", e.target.value)} />
                          </div>
                        </div>
                        <div className="field" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>Resp. Rate (/min)</label>
                          <div className={styles.iconInputWrapper}>
                            <div className={styles.iconInputIcon} style={{ color: "#6366f1" }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
                            <input className={styles.iconInput} value={summary.vitals_resp_rate} onChange={e => updateField("vitals_resp_rate", e.target.value)} />
                          </div>
                        </div>
                        <div className="field" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>SpO₂ (%)</label>
                          <div className={styles.iconInputWrapper}>
                            <div className={styles.iconInputIcon} style={{ color: "#0ea5e9" }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg></div>
                            <input className={styles.iconInput} value={summary.vitals_spo2} onChange={e => updateField("vitals_spo2", e.target.value)} />
                          </div>
                        </div>
                        <div className="field" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>Weight (kg)</label>
                          <div className={styles.iconInputWrapper}>
                            <div className={styles.iconInputIcon} style={{ color: "#3b82f6" }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 3v2M18 3v2M4 14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7z"/></svg></div>
                            <input className={styles.iconInput} value={summary.vitals_weight} onChange={e => updateField("vitals_weight", e.target.value)} />
                          </div>
                        </div>
                        <div className="field" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>Height (cm)</label>
                          <div className={styles.iconInputWrapper}>
                            <div className={styles.iconInputIcon} style={{ color: "#3b82f6" }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 3L3 21M21 3l-6 6M3 21l6-6M15 9l-6 6"/></svg></div>
                            <input className={styles.iconInput} value={summary.vitals_height} onChange={e => updateField("vitals_height", e.target.value)} />
                          </div>
                        </div>
                        <div className="field" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>BMI (kg/m²)</label>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8fafc", padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", minHeight: 38, boxSizing: "border-box" }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>{calculateBMI(summary.vitals_weight || "", summary.vitals_height || "") || "--"}</span>
                            {(() => {
                              const bmi = parseFloat(calculateBMI(summary.vitals_weight || "", summary.vitals_height || ""));
                              if (!isNaN(bmi)) {
                                if (bmi < 18.5) return <span className={styles.bmiAbnormal}>Underweight</span>;
                                if (bmi >= 18.5 && bmi < 25) return <span className={styles.bmiNormal}>Normal</span>;
                                if (bmi >= 25 && bmi < 30) return <span className={styles.bmiAbnormal}>Overweight</span>;
                                return <span className={styles.bmiAbnormal}>Obese</span>;
                              }
                              return null;
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className={styles.summaryCard}>
                      <div className={styles.cardHeader} style={{ marginBottom: 16 }}>
                        <div className={styles.cardTitle}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                          4. MEDICAL HISTORY
                        </div>
                      </div>
                      <MultiSelectChips 
                        options={["Diabetes", "Hypertension", "Asthma", "COPD", "Heart Disease", "Kidney Disease", "Liver Disease", "Stroke", "Thyroid Disorder"]} 
                        selected={summary.medical_history || []} 
                        onChange={(val: any) => updateField("medical_history", val)} 
                        allowCustom={true} 
                        customLabel="+ Add Custom Condition"
                        activeColor="#eff6ff"
                        activeTextColor="#1d4ed8"
                        activeBorderColor="#bfdbfe"
                      />
                    </div>

                    <div className={styles.summaryCard}>
                      <div className={styles.cardHeader} style={{ marginBottom: 16 }}>
                        <div className={styles.cardTitle}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                          9. RISK FLAGS
                        </div>
                      </div>
                      <MultiSelectChips 
                        options={["Fall Risk", "Aspiration", "Bleeding", "DVT", "Seizure"]} 
                        selected={summary.risk_flags || []} 
                        onChange={(val: any) => updateField("risk_flags", val)} 
                        allowCustom={true}
                        customLabel="+ Add Custom Risk"
                        activeColor="#fef2f2"
                        activeTextColor="#dc2626"
                        activeBorderColor="#fecaca"
                      />
                    </div>
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
                                  Patient Context
                                </div>
                                <span className={styles.cardTitleBadge}>REQUIRED</span>
                              </div>
                              {(!searchParams.get("patientId") && !isNewPatientMode && !summary.patientId) && (
                                <button type="button" className={styles.btnRegisterNew} onClick={() => setIsNewPatientMode(true)}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                  Register New Patient
                                </button>
                              )}
                            </div>
                            
                            {(!searchParams.get("patientId") && !isNewPatientMode && !summary.patientId) ? (
                              <div className="field" style={{ position: "relative" }} ref={searchInputRef}>
                                <div style={{ position: "relative" }}>
                                  <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                                  <input
                                    type="text"
                                    id="patientSearchInput"
                                    value={searchTerm}
                                    onChange={(e) => {
                                      setSearchTerm(e.target.value);
                                      if (e.target.value.trim().length >= 2) setShowDropdown(true);
                                      else setShowDropdown(false);
                                      setFocusedResultIndex(-1);
                                    }}
                                    onFocus={() => {
                                      if (searchTerm.trim().length >= 2) setShowDropdown(true);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "ArrowDown") {
                                        e.preventDefault();
                                        setFocusedResultIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : prev));
                                      } else if (e.key === "ArrowUp") {
                                        e.preventDefault();
                                        setFocusedResultIndex((prev) => (prev > 0 ? prev - 1 : prev));
                                      } else if (e.key === "Enter") {
                                        e.preventDefault();
                                        if (focusedResultIndex >= 0 && focusedResultIndex < searchResults.length) {
                                          handleSelectPatient(searchResults[focusedResultIndex]);
                                        }
                                      } else if (e.key === "Escape") {
                                        setShowDropdown(false);
                                      }
                                    }}
                                    style={{ paddingLeft: 36, height: 46 }}
                                    placeholder="Search by Patient ID, Name or Mobile Number"
                                  />
                                  {isSearching && (
                                    <div style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)" }}>
                                      <div className={styles.spinner} style={{ width: 18, height: 18, borderTopColor: "#6366f1" }} />
                                    </div>
                                  )}
                                </div>
                                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6, paddingLeft: 2 }}>Type at least 2 characters to search</div>
                                
                                {showDropdown && searchTerm.trim().length >= 2 && (
                                  <div className={styles.patientDropdown}>
                                    {isSearching ? (
                                      <div className={styles.dropdownItem}>Searching...</div>
                                    ) : searchResults.length > 0 ? (
                                      searchResults.map((patient, idx) => (
                                        <div
                                          key={patient.id}
                                          className={`${styles.dropdownItem} ${idx === focusedResultIndex ? styles.dropdownItemActive : ""}`}
                                          onClick={() => handleSelectPatient(patient)}
                                          onMouseEnter={() => setFocusedResultIndex(idx)}
                                        >
                                          <div className={styles.dropdownName}>{patient.name}</div>
                                          <div className={styles.dropdownDetails}>
                                            {patient.id.slice(0, 8)} • {patient.age_sex || "N/A"} • {patient.contact || "No Phone"}
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      <div className={styles.dropdownItem} onClick={() => setShowDropdown(false)}>
                                        <div style={{ color: "#6b7280", marginBottom: 4 }}>No patient found.</div>
                                        <div style={{ color: "#4f46e5", fontSize: 12, fontWeight: 500 }} onClick={(e) => { e.stopPropagation(); setIsNewPatientMode(true); setShowDropdown(false); }}>+ Register New Patient</div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="field">
                                <label>Full Name</label>
                                <div style={{ display: "flex", gap: 8 }}>
                                  <input
                                    id="patientName"
                                    type="text"
                                    value={summary.patientName || ""}
                                    onChange={(e) => updateField("patientName", e.target.value)}
                                    style={{ flex: 1 }}
                                  />
                                  {(!searchParams.get("patientId") && (summary.patientId || isNewPatientMode)) && (
                                    <button 
                                      type="button"
                                      onClick={() => {
                                        if (window.confirm("Reset patient data?")) {
                                          setSummary(prev => ({ ...prev, patientId: undefined, patientName: "", age: "", sex: "Male", phone: "", dateOfBirth: "", address: "", allergies: "", has_diabetes: false, has_hypertension: false, has_thyroid: false, past_surgeries: "" }));
                                          setIsNewPatientMode(false);
                                          setSearchTerm("");
                                        }
                                      }}
                                      className={styles.btnClearPatient}
                                      style={{ color: "#ef4444", borderColor: "#fecaca", background: "#fef2f2" }}
                                    >
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                      Clear Patient
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Selected Patient Card */}
                          {(summary.patientId && summary.patientName) && (
                            <div className={styles.summaryCard} style={{ padding: 0, overflow: 'hidden' }}>
                              <div style={{ background: '#f8fafc', padding: '12px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#334155' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                Selected Patient
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
                                      {summary.patientId ? summary.patientId.slice(0, 8).toUpperCase() : 'N/A'} • {summary.age || 'N/A'}
                                    </div>
                                    <div className={styles.patientDetailsSub}>
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                      {summary.phone || 'N/A'}
                                    </div>
                                  </div>
                                </div>
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
                                <label>Sex</label>
                                <select value={summary.sex || "Male"} onChange={(e) => updateField("sex", e.target.value)}>
                                  <option>Male</option>
                                  <option>Female</option>
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
                            </div>

                            <div className={styles.grid2Col}>
                              <div className="field">
                                <label>Ward</label>
                                <input type="text" placeholder="Ward A" value={summary.ward || ""} onChange={(e) => updateField("ward", e.target.value)} />
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
                                <button type="button" className={styles.btnNow} onClick={() => {
                                  const d = new Date();
                                  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
                                  updateField("date_admission", d.toISOString().slice(0, 16));
                                }}>
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

                        {/* --- Right Sidebar Column --- */}
                        <div className={styles.sidebar}>
                          
                          {/* Alerts & History */}
                          <div className={styles.alertCard}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 800, color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                              Alerts &amp; History
                            </div>
                            
                            {(((typeof summary.allergies === 'string' ? summary.allergies : Array.isArray(summary.allergies) ? summary.allergies.join(', ') : "") || "").trim() || summary.has_diabetes || summary.has_hypertension || summary.has_thyroid) ? (
                              <>
                                {((typeof summary.allergies === 'string' ? summary.allergies : Array.isArray(summary.allergies) ? summary.allergies.join(', ') : "") || "").trim() && (
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
                          </div>

                          {/* Admission Summary Sidebar */}
                          <div className={styles.alertCard}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 800, color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
                              Admission Summary
                            </div>
                            
                            <div className={styles.summaryList}>
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
                          </div>

                        </div>
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className={styles.stepFadeIn} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      
                      <div className={styles.summaryCard}>
                        <div className={styles.cardHeader} style={{ marginBottom: 16 }}>
                          <div className={styles.cardTitle}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                            1. CHIEF COMPLAINT
                          </div>
                          <div className={styles.cardHeaderRequired}>Required</div>
                        </div>
                        <ChiefComplaintRepeater items={summary.chief_complaints_extended || []} onChange={(val: any) => updateField("chief_complaints_extended", val)} />
                      </div>

                      <div className={styles.summaryCard}>
                        <div className={styles.cardHeader} style={{ marginBottom: 16 }}>
                          <div className={styles.cardTitle}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                            2. HISTORY OF PRESENT ILLNESS
                          </div>
                        </div>
                        <textarea
                          className={styles.bulletInput}
                          value={summary.hpi || ""}
                          onChange={(e) => updateField("hpi", e.target.value)}
                          placeholder="Detailed present illness notes..."
                          rows={4}
                          style={{ minHeight: 80 }}
                        />
                      </div>

                      <div className={styles.gridSideBySide}>
                        <div className={styles.summaryCard}>
                          <div className={styles.cardHeader} style={{ marginBottom: 16 }}>
                            <div className={styles.cardTitle}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><path d="M10.5 20.5l-6-6a4.5 4.5 0 0 1 6.5-6.5l6 6a4.5 4.5 0 0 1-6.5 6.5z"/><path d="M14 6l4 4"/><path d="M7 13l4 4"/></svg>
                              5. CURRENT MEDICATIONS
                            </div>
                          </div>
                          <MedicationRepeater items={summary.current_medications || []} onChange={(val: any) => updateField("current_medications", val)} />
                        </div>

                        <div className={styles.summaryCard}>
                          <div className={styles.cardHeader} style={{ marginBottom: 16 }}>
                            <div className={styles.cardTitle}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                              6. ALLERGIES
                            </div>
                          </div>
                          <AllergyRepeater items={summary.allergy_details || []} onChange={(val: any) => updateField("allergy_details", val)} />
                        </div>
                      </div>

                      <div className={styles.gridSideBySide6040}>
                        <div className={styles.summaryCard}>
                          <div className={styles.cardHeader} style={{ marginBottom: 16 }}>
                            <div className={styles.cardTitle}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                              7. CLINICAL EXAMINATION
                            </div>
                          </div>
                          <textarea
                            className={styles.bulletInput}
                            value={summary.examination_findings || ""}
                            onChange={(e) => updateField("examination_findings", e.target.value)}
                            placeholder="General and systemic examination findings..."
                            rows={3}
                            style={{ minHeight: 60 }}
                          />
                        </div>

                        <div className={`${styles.summaryCard} ${styles.diagnosisHighlight}`}>
                          <div className={styles.cardHeader} style={{ marginBottom: 16 }}>
                            <div className={styles.cardTitle}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                              8. PROVISIONAL DIAGNOSIS
                            </div>
                          </div>
                          <input
                            className={styles.bulletInput}
                            value={summary.provisional_diagnosis || ""}
                            onChange={(e) => updateField("provisional_diagnosis", e.target.value)}
                            placeholder="Enter provisional diagnosis..."
                          />
                        </div>
                      </div>

                      <div className={styles.gridSideBySide5050}>
                        <div className={styles.summaryCard}>
                          <div className={styles.cardHeader} style={{ marginBottom: 16 }}>
                            <div className={styles.cardTitle}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                              10. INFECTION CONTROL
                            </div>
                          </div>
                          <select
                            className={styles.bulletInput}
                            value={summary.infection_control || "None"}
                            onChange={(e) => updateField("infection_control", e.target.value)}
                          >
                            <option value="None">Standard Precautions (None)</option>
                            <option value="Contact">Contact Precautions</option>
                            <option value="Droplet">Droplet Precautions</option>
                            <option value="Airborne">Airborne Precautions</option>
                          </select>
                        </div>
                        
                        <div className={styles.summaryCard}>
                          <div className={styles.cardHeader} style={{ marginBottom: 16 }}>
                            <div className={styles.cardTitle}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                              ADDITIONAL NOTES
                            </div>
                          </div>
                          <input
                            className={styles.bulletInput}
                            value={summary.additional_notes || ""}
                            onChange={(e) => updateField("additional_notes", e.target.value)}
                            placeholder="Any other clinical notes..."
                          />
                        </div>
                      </div>

                    </div>
                  )}

                  {step === 3 && (
                    <div className={styles.stepFadeIn} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                      
                      {/* --- Diagnosis & Observations --- */}
                      <div className={styles.gridSideBySide}>
                        <div
                          className={`${styles.summaryCard} ${styles.diagnosisHighlight}`}
                          style={{
                            borderBottom: "4px solid var(--sanctuary-primary)",
                            display: "flex",
                            flexDirection: "column"
                          }}
                        >
                          <div className={styles.cardHeader}>
                            <div className={styles.cardTitle}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                              Final Diagnosis
                            </div>
                            <div className={styles.cardHeaderRequired}>Required</div>
                          </div>
                          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                            <textarea
                              className={styles.bulletInput}
                              value={summary.final_diagnosis || ""}
                              onChange={(e) => updateField("final_diagnosis", e.target.value)}
                              placeholder="Enter final diagnosis..."
                              style={{ flex: 1, minHeight: 80, resize: "none", fontSize: 15, fontWeight: 500, padding: 16 }}
                            />
                          </div>
                        </div>

                        <div className={styles.summaryCard} style={{ borderLeft: "4px solid #8b5cf6", display: "flex", flexDirection: "column" }}>
                          <div className={styles.cardHeader}>
                            <div className={styles.cardTitle}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                              Doctor Observations
                            </div>
                            <div className={summary.doctor_observations ? styles.cardHeaderCompleted : styles.cardHeaderOptional}>
                              {summary.doctor_observations ? "Completed" : "Optional"}
                            </div>
                          </div>
                          <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column" }}>
                            <textarea
                              value={summary.doctor_observations || ""}
                              onChange={(e) => updateField("doctor_observations", e.target.value)}
                              placeholder="Clinical observations, rationale..."
                              style={{
                                flex: 1,
                                width: "100%",
                                minHeight: 100,
                                border: "none",
                                resize: "none",
                                background: "#f5f3ff",
                                padding: 16,
                                borderRadius: 8,
                                outline: "none",
                                fontSize: 14,
                                color: "#4c1d95",
                                boxSizing: "border-box"
                              }}
                            ></textarea>
                            <div style={{ position: "absolute", bottom: 8, right: 12, fontSize: 11, color: "#8b5cf6", fontWeight: 600 }}>
                              {(summary.doctor_observations || "").length} chars
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* --- Investigations & Treatment Plan --- */}
                      <div className={styles.gridSideBySide6040}>
                        <div className={styles.summaryCard} style={{ display: "flex", flexDirection: "column" }}>
                          <div className={styles.cardHeader} style={{ marginBottom: 16 }}>
                            <div className={styles.cardTitle}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><path d="m4.83 6.74 4.58 9.15a3 3 0 1 1-5.36 2.68L4.83 6.74ZM12 22a3 3 0 1 1-3-3 3 3 0 0 1 3 3Zm9-9a3 3 0 1 1-3-3 3 3 0 0 1 3 3Zm0-9-4.58 9.15a3 3 0 1 1 5.36-2.68L21 4Z"></path></svg>
                              Treatment Plan
                            </div>
                          </div>
                          <TreatmentPlanRepeater items={summary.treatment_plan || []} onChange={(val: any) => updateField("treatment_plan", val)} />
                        </div>

                        <div className={styles.summaryCard} style={{ display: "flex", flexDirection: "column" }}>
                          <div className={styles.cardHeader} style={{ marginBottom: 16 }}>
                            <div className={styles.cardTitle}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                              Investigations Advised
                            </div>
                          </div>
                          <InvestigationEditor field="investigations" items={summary.investigations} updateField={updateField} />
                        </div>
                      </div>

                      {/* --- Admission Orders --- */}
                      <div className={styles.summaryCard}>
                        <div className={styles.cardHeader} style={{ marginBottom: 16 }}>
                          <div className={styles.cardTitle}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                            Admission Orders
                          </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <label style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>Diet Instructions</label>
                            <select
                              className={styles.iconInput}
                              value={summary.diet_instructions}
                              onChange={(e) => updateField("diet_instructions", e.target.value)}
                              style={{ width: "100%" }}
                            >
                              <option value="">Select Diet...</option>
                              <option value="Regular Diet">Regular Diet</option>
                              <option value="NPO (Nothing by Mouth)">NPO (Nothing by Mouth)</option>
                              <option value="Clear Liquid">Clear Liquid</option>
                              <option value="Diabetic / Low Sugar">Diabetic / Low Sugar</option>
                              <option value="Low Sodium">Low Sodium</option>
                            </select>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <label style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>Activity Restrictions</label>
                            <select
                              className={styles.iconInput}
                              value={summary.activity_restrictions}
                              onChange={(e) => updateField("activity_restrictions", e.target.value)}
                              style={{ width: "100%" }}
                            >
                              <option value="">Select Activity...</option>
                              <option value="Ad Lib (As Desired)">Ad Lib (As Desired)</option>
                              <option value="Bed Rest">Bed Rest</option>
                              <option value="Bed Rest with Bathroom Privileges">Bed Rest with BRP</option>
                              <option value="Ambulate with Assistance">Ambulate with Assistance</option>
                            </select>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <label style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>Nursing Instructions</label>
                            <input
                              className={styles.iconInput}
                              value={summary.nursing_instructions}
                              onChange={(e) => updateField("nursing_instructions", e.target.value)}
                              placeholder="e.g. Vitals q4h, Strict I/O"
                              style={{ width: "100%" }}
                            />
                          </div>
                        </div>
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
                ️ {isQuickMode ? "Reset" : "Cancel"}
              </button>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button
                type="button"
                className={styles.btnSecondarySticky}
                onClick={handleSaveDraft}
                disabled={isSaving}
                title="Save draft of admission record"
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
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
                {isSaving ? "Saving…" : "Save Draft"}
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
                  onClick={handleNextStep}
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

      {showDraftModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, animation: "fadeIn 0.2s ease-out" }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 32, maxWidth: 400, width: "100%", textAlign: "center", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}>
            <div style={{ width: 64, height: 64, background: "#d1fae5", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: "var(--sanctuary-ink)", marginBottom: 8 }}>Draft Saved Successfully</h3>
            <p style={{ fontSize: 14, color: "#64748b", marginBottom: 28 }}>Your progress has been safely stored. What would you like to do next?</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <button type="button" onClick={handleDraftContinue} style={{ width: "100%", padding: "12px", background: "var(--sanctuary-blue)", color: "#fff", borderRadius: 12, fontWeight: 700, border: "none", cursor: "pointer" }}>Continue Editing</button>
              <button type="button" onClick={handleDraftDashboard} style={{ width: "100%", padding: "12px", background: "#f1f5f9", color: "var(--sanctuary-ink)", borderRadius: 12, fontWeight: 600, border: "none", cursor: "pointer" }}>Back to Dashboard</button>
              <button type="button" onClick={handleDraftStartNew} style={{ width: "100%", padding: "12px", background: "transparent", color: "#64748b", borderRadius: 12, fontWeight: 600, border: "1px dashed #cbd5e1", cursor: "pointer" }}>Start New Admission Record</button>
            </div>
          </div>
        </div>
      )}
      {showFinalizeModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, animation: "fadeIn 0.2s ease-out" }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 32, maxWidth: 400, width: "100%", textAlign: "center", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}>
            <div style={{ width: 64, height: 64, background: "#d1fae5", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: "var(--sanctuary-ink)", marginBottom: 8 }}>Admission Record Finalized</h3>
            <p style={{ fontSize: 14, color: "#64748b", marginBottom: 28 }}>The admission record has been successfully saved and linked to the patient. What would you like to do next?</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <button type="button" onClick={handleBack} style={{ width: "100%", padding: "12px", background: "var(--sanctuary-blue)", color: "#fff", borderRadius: 12, fontWeight: 700, border: "none", cursor: "pointer" }}>View Patient Profile</button>
              
              {finalizeRecordId && (
                <button type="button" onClick={() => {
                  const params = new URLSearchParams();
                  const dId = searchParams.get("doctorId");
                  const dName = searchParams.get("doctorName") || searchParams.get("docName");
                  if (dId) params.set("doctorId", dId);
                  if (dName) params.set("doctorName", dName);
                  params.set("print", "true");
                  const qs = params.toString();
                  window.open(`/portal/admission-record/view?id=${finalizeRecordId}&${qs}`, '_blank');
                }} style={{ width: "100%", padding: "12px", background: "#fef3c7", color: "#d97706", borderRadius: 12, fontWeight: 700, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                  Print Admission Record
                </button>
              )}
              <button type="button" onClick={handleBack} style={{ width: "100%", padding: "12px", background: "#f1f5f9", color: "var(--sanctuary-ink)", borderRadius: 12, fontWeight: 600, border: "none", cursor: "pointer" }}>Back to Dashboard</button>
              <button type="button" onClick={() => {
                handleDraftStartNew();
                setShowFinalizeModal(false);
              }} style={{ width: "100%", padding: "12px", background: "transparent", color: "#64748b", borderRadius: 12, fontWeight: 600, border: "1px dashed #cbd5e1", cursor: "pointer" }}>Start New Admission Record</button>
            </div>
          </div>
        </div>
      )}
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
