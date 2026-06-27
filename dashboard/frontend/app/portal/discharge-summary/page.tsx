"use client";

import React, { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TopBar from "@/components/TopBar";
import { useClinic } from "@/context/ClinicContext";
import { createClient } from "@/lib/supabase/client";
import styles from "./page.module.css";

const DIAGNOSIS_OPTIONS = [
  "Pneumonia",
  "Pneumonitis",
  "Pulmonary edema",
  "Bronchitis",
  "Asthma",
  "COPD",
  "Tuberculosis",
  "Lung cancer",
  "Acute respiratory distress syndrome",
  "Pleural effusion"
];

const MEDICATION_OPTIONS = [
  "Paracetamol",
  "Ibuprofen",
  "Amoxicillin",
  "Azithromycin",
  "Pantoprazole",
  "Ondansetron",
  "Cetirizine",
  "Metformin",
  "Amlodipine",
  "Losartan",
  "Atorvastatin",
  "Aspirin",
  "Clopidogrel",
  "Ceftriaxone",
  "Dexamethasone"
];


interface Medicine {
  name: string;
  dosage: string;
  frequency: string;
}

interface SummaryData {
  patientName: string;
  phone: string;
  age: string;
  ageUnit: string;
  sex: string;
  regNo: string;
  doa: string;
  dod: string;
  doctor: string;
  attendingPhysician: string;
  dischargingNurse: string;
  dischargeDestination: string;
  emergencyContactRelation: string;
  emergencyContactNumber: string;
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
  fetchSmartSuggestion: (field: string, index: number, currentText: string) => void;
}

const BulletListEditor = ({ field, items, placeholder, updateField, autoSaveStatus, setAutoSaveStatus, suggestTimer, activeSuggestion, setActiveSuggestion, fetchSmartSuggestion }: BulletListEditorProps) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const updateItem = (index: number, val: string) => {
    const newItems = [...items];
    newItems[index] = val;
    updateField(field, newItems);
    if (autoSaveStatus !== "idle") setAutoSaveStatus("idle");
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    suggestTimer.current = setTimeout(() => { fetchSmartSuggestion(field, index, val); }, 300);
  };
  const acceptSuggestion = (index: number) => {
    if (activeSuggestion && activeSuggestion.index === index) {
      const newItems = [...items];
      newItems[index] = activeSuggestion.fullText;
      updateField(field, newItems);
      setActiveSuggestion(null);
    }
  };
  const addItem = (index: number, initialValue: string = "") => {
    const newItems = [...items];
    
    // If the current point is empty, just replace it instead of adding a new one
    if (newItems[index] === "") {
      newItems[index] = initialValue;
      updateField(field, newItems);
      setActiveSuggestion(null);
      setTimeout(() => inputRefs.current[index]?.focus(), 0);
    } else {
      newItems.splice(index + 1, 0, initialValue);
      updateField(field, newItems);
      setActiveSuggestion(null);
      setTimeout(() => inputRefs.current[index + 1]?.focus(), 0);
    }
  };
  const removeItem = (index: number) => {
    if (items.length <= 1) { updateField(field, [""]); return; }
    const newItems = items.filter((_, i) => i !== index);
    updateField(field, newItems);
    setActiveSuggestion(null);
    setTimeout(() => inputRefs.current[Math.max(0, index - 1)]?.focus(), 0);
  };
  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Tab" && activeSuggestion && activeSuggestion.index === index) { e.preventDefault(); acceptSuggestion(index); }
    else if (e.key === "Escape") { setActiveSuggestion(null); }
    else if (e.key === "Enter") { e.preventDefault(); addItem(index); }
    else if (e.key === "Backspace" && items[index] === "" && items.length > 1) { e.preventDefault(); removeItem(index); }
  };
  return (
    <div className={styles.bulletListContainer}>
      {items.length === 0 && field !== "treatment" && (
        <button className={styles.btnAddPoint} onClick={() => updateField(field, [""])}>+ Start adding {field}</button>
      )}
      {items.length > 0 && items.map((item, idx) => (
        <div key={idx} className={styles.bulletRow}>
          <div className={styles.bulletMarker} />
          <div className={styles.inputWrapper}>
            <input ref={(el) => { inputRefs.current[idx] = el; }} className={styles.bulletInput} value={item} onChange={(e) => updateItem(idx, e.target.value)} onKeyDown={(e) => onKeyDown(e, idx)} onBlur={() => setTimeout(() => setActiveSuggestion(null), 200)} placeholder={idx === 0 ? placeholder : "Next point..."} />
            {activeSuggestion && activeSuggestion.field === field && activeSuggestion.index === idx && (
              <div className={`${styles.ghostText} ${styles.active}`}><span style={{ color: "transparent", visibility: "hidden" }}>{item}</span>{activeSuggestion.text}<span className={styles.ghostHint}>TAB</span></div>
            )}
          </div>
          <button className={styles.btnRemovePoint} onClick={() => removeItem(idx)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" /></svg>
          </button>
        </div>
      ))}
      {field === "treatment" && (
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "8px" }}>
          <button type="button" className={styles.pillButton} onClick={(e) => { e.preventDefault(); addItem(items.length - 1, "Medication given: "); }}>
            💊 Medication
          </button>
          <button type="button" className={styles.pillButton} onClick={(e) => { e.preventDefault(); addItem(items.length - 1, "Injection given: "); }}>
            💉 Injection
          </button>
          <button type="button" className={styles.pillButton} onClick={(e) => { e.preventDefault(); addItem(items.length - 1, "Fluid given: "); }}>
            💧 Fluid
          </button>
          <button type="button" className={styles.pillButton} onClick={(e) => { e.preventDefault(); addItem(items.length - 1, "Procedure done: "); }}>
            🩺 Procedure
          </button>
        </div>
      )}
    </div>
  );
};

const MedicationRepeater = ({ items, onChange }: any) => {
  const [activeDropdownIndex, setActiveDropdownIndex] = useState<number | null>(null);
  const [filteredOptions, setFilteredOptions] = useState<string[]>([]);

  const addMed = () => onChange([...items, { name: "", dosage: "", frequency: "" }]);
  const removeMed = (idx: number) => onChange(items.filter((_: any, i: number) => i !== idx));
  const updateMed = (idx: number, field: string, val: string) => {
    const next = [...items];
    next[idx] = { ...next[idx], [field]: val };
    onChange(next);
  };
  const parseDosage = (d: string) => {
    const m = (d || "").match(/^([\d.]+)\s*(.*)$/);
    if (m) return { val: m[1], unit: m[2] || "mg" };
    return { val: d || "", unit: "mg" };
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
          <div className={styles.iconInputWrapper} style={{ position: "relative", overflow: "visible" }}>
            <div className={styles.iconInputIcon}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><path d="M10.5 20.5l-6-6a4.5 4.5 0 0 1 6.5-6.5l6 6a4.5 4.5 0 0 1-6.5 6.5z"/><path d="M14 6l4 4"/><path d="M7 13l4 4"/></svg></div>
            <input 
              className={styles.iconInput} 
              placeholder="e.g. Paracetamol" 
              value={med.name} 
              onChange={(e) => {
                const val = e.target.value;
                updateMed(i, "name", val);
                const filtered = MEDICATION_OPTIONS.filter((opt) => opt.toLowerCase().includes(val.toLowerCase()));
                setFilteredOptions(filtered);
                setActiveDropdownIndex(i);
              }}
              onFocus={() => {
                setFilteredOptions(MEDICATION_OPTIONS);
                setActiveDropdownIndex(i);
              }}
              onBlur={() => {
                // Use a short timeout so that mousedown on options fires first
                setTimeout(() => setActiveDropdownIndex(null), 200);
              }}
            />
            {activeDropdownIndex === i && filteredOptions.length > 0 && (
              <ul className={styles.dropdown} style={{ top: "100%", zIndex: 50 }}>
                {filteredOptions.map((opt) => (
                  <li
                    key={opt}
                    onMouseDown={(e) => {
                      // Prevent default to avoid blur firing before update
                      e.preventDefault();
                      updateMed(i, "name", opt);
                      setActiveDropdownIndex(null);
                    }}
                  >
                    {opt}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div style={{ display: "flex", gap: "4px" }}>
            <input 
              className={styles.iconInput} 
              style={{ paddingLeft: 12, width: "60px", minWidth: 0 }} 
              placeholder="500" 
              value={parseDosage(med.dosage).val} 
              onChange={(e) => {
                const u = parseDosage(med.dosage).unit;
                updateMed(i, "dosage", e.target.value ? `${e.target.value} ${u}` : "");
              }} 
            />
            <select 
              className={styles.iconInput}
              style={{ padding: "0 8px", width: "auto" }}
              value={parseDosage(med.dosage).unit}
              onChange={(e) => {
                const v = parseDosage(med.dosage).val;
                updateMed(i, "dosage", v ? `${v} ${e.target.value}` : "");
              }}
            >
              <option value="mg">mg</option>
              <option value="g">g</option>
              <option value="mcg">mcg</option>
              <option value="ml">ml</option>
              <option value="tbsp">tbsp</option>
              <option value="tsp">tsp</option>
              <option value="units">units</option>
              <option value="drops">drops</option>
              <option value="patch">patch</option>
            </select>
          </div>
          <input className={styles.iconInput} style={{ paddingLeft: 12 }} placeholder="BID" value={med.frequency} onChange={(e) => updateMed(i, "frequency", e.target.value)} />
          <button onClick={() => removeMed(i)} style={{ color: "#ef4444", background: "none", border: "none", cursor: "pointer", padding: "0 8px" }}>✕</button>
        </div>
      ))}
      <button onClick={addMed} className={styles.btnAddPoint} style={{ alignSelf: "flex-start", marginTop: 4 }}>
        + Add Medication
      </button>
    </div>
  );
};

export default function DischargeSummaryRedesignPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DischargeSummaryRedesign />
    </Suspense>
  );
}

function DischargeSummaryRedesign() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { clinic, loading: clinicLoading } = useClinic();
  const supabase = createClient();

  const [step, setStep] = useState(1);
  const [summary, setSummary] = useState<SummaryData>({
    patientName: "", phone: "", age: "", ageUnit: "Years", sex: "Male", regNo: "", dischargeDestination: "", emergencyContactRelation: "", emergencyContactNumber: "", doa: new Date().toISOString().slice(0, 16), dod: new Date().toISOString().slice(0, 16), doctor: "", attendingPhysician: "", dischargingNurse: "", diagnosis: "", complaints: [""], findings: [""], treatment: [""], dischargeCondition: [""], advice: [""], medicines: []
  });
  
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [filteredDiagnosisOptions, setFilteredDiagnosisOptions] = useState<string[]>(DIAGNOSIS_OPTIONS);
  const [showDiagnosisDropdown, setShowDiagnosisDropdown] = useState(false);

  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const suggestTimer = useRef<NodeJS.Timeout | null>(null);
  const [activeSuggestion, setActiveSuggestion] = useState<Suggestion | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  const calculateLengthOfStay = (doa: string, dod: string) => {
    if (!doa || !dod) return "—";
    const d1 = new Date(doa);
    const d2 = new Date(dod);
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return "—";
    const diffTime = d2.getTime() - d1.getTime();
    if (diffTime < 0) return "Invalid Dates";
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Same Day";
    return `${diffDays} Day${diffDays > 1 ? 's' : ''}`;
  };

  useEffect(() => {
    const draft = localStorage.getItem("discharge_summary_draft");
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        setSummary(prev => ({ ...prev, ...parsed }));
        const sStep = localStorage.getItem("discharge_summary_draft_step");
        if (sStep) setStep(parseInt(sStep));
      } catch (e) {
        console.error("Draft error", e);
      }
    } else {
      const pName = searchParams.get("patientName");
      const pId = searchParams.get("patientId");
      if (pName) setSummary(prev => ({ ...prev, patientName: decodeURIComponent(pName) }));
      const dName = searchParams.get("doctorName") || searchParams.get("docName");
      if (dName) setSummary(prev => ({ ...prev, doctor: decodeURIComponent(dName) }));
    }
  }, [searchParams]);

  const updateField = (field: keyof SummaryData, value: any) => {
    setSummary((prev) => {
      const next = { ...prev, [field]: value };
      localStorage.setItem("discharge_summary_draft", JSON.stringify(next));
      return next;
    });
    setAutoSaveStatus("idle");
  };

  const handleSetStep = (val: number | ((prev: number) => number)) => {
    setStep(prev => {
      const nStep = typeof val === "function" ? val(prev) : val;
      localStorage.setItem("discharge_summary_draft_step", nStep.toString());
      return nStep;
    });
  };

  const fetchSmartSuggestion = async (field: string, index: number, currentText: string) => {
    // Stub
  };

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const handleFinalSubmit = async () => {
    if (!summary.patientName) return alert("Patient Name is required");
    setIsSaving(true);
    try {
      let patientId: string | null = null;
      if (clinic?.id) {
        let existingPatient = null;
        if (summary.phone) {
          const { data } = await supabase.from("patients").select("*").eq("contact", summary.phone).eq("clinic_id", clinic.id).maybeSingle();
          existingPatient = data;
        }
        if (!existingPatient) {
          const { data } = await supabase.from("patients").select("*").eq("name", summary.patientName).eq("clinic_id", clinic.id).limit(1).maybeSingle();
          existingPatient = data;
        }
        if (existingPatient?.id) patientId = existingPatient.id;
        else {
          const { data: newPatient } = await supabase.from("patients").insert({
            name: summary.patientName, contact: summary.phone || "0000000000", age: parseInt(summary.age) || null, gender: summary.sex, clinic_id: clinic.id
          }).select("id").single();
          if (newPatient?.id) patientId = newPatient.id;
        }
      }

      const { data: insertedRecord, error } = await supabase.from("discharge_summaries").insert([{
        patient_name: summary.patientName, reg_no: summary.regNo || '', age_sex: `${summary.age} ${summary.ageUnit} / ${summary.sex}`,
        doctor_name: summary.doctor, date_admission: summary.doa, date_discharge: summary.dod, diagnosis: summary.diagnosis,
        attending_physician: summary.attendingPhysician, discharging_nurse: summary.dischargingNurse,
        discharge_destination: summary.dischargeDestination, emergency_contact_relation: summary.emergencyContactRelation, emergency_contact_number: summary.emergencyContactNumber,
        complaints: JSON.stringify(summary.complaints), findings: JSON.stringify(summary.findings), treatment: JSON.stringify(summary.treatment),
        discharge_condition: JSON.stringify(summary.dischargeCondition),
        medicines: JSON.stringify(summary.medicines), advice: JSON.stringify(summary.advice), clinic_id: clinic?.id, patient_id: patientId
      }]).select("id").single();
      
      if (error) throw error;
      localStorage.removeItem("discharge_summary_draft");
      localStorage.removeItem("discharge_summary_draft_step");
      
      const params = new URLSearchParams();
      const dId = searchParams.get("doctorId");
      const dName = searchParams.get("doctorName") || searchParams.get("docName");
      if (dId) params.set("doctorId", dId);
      if (dName) params.set("doctorName", dName);
      params.set("id", insertedRecord.id);
      const qs = params.toString();
      
      router.push(`/portal/discharge-summary/view${qs ? `?${qs}` : ""}`);
    } catch (e: any) {
      alert("Error saving: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const renderWizardProgress = () => {
    const steps = [
      { id: 1, label: "Patient Context", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg> },
      { id: 2, label: "Clinical Information", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg> },
      { id: 3, label: "Discharge Planning", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg> },
    ];
    return (
      <div className={styles.wizardProgress}>
        <div className={styles.wizardProgressInner}>
          {steps.map((s, idx) => (
            <React.Fragment key={s.id}>
              <div className={`${styles.wizardStep} ${step === s.id ? styles.wizardStepActive : step > s.id ? styles.wizardStepCompleted : ""}`} onClick={() => handleSetStep(s.id)} style={{ cursor: "pointer" }}>
                <div className={styles.wizardStepIcon}>{s.icon}</div>
                <div className={styles.wizardStepLabel}><small>Step {s.id} of 3</small><span>{s.label}</span></div>
              </div>
              {idx < steps.length - 1 && <div className={styles.wizardStepDivider} />}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  const renderClinicalCard = (title: string, field: keyof SummaryData, icon: React.ReactNode, placeholder: string, borderColor?: string) => {
    const items = summary[field] as any[];
    return (
      <div className={`${styles.summaryCard} ${styles.inlineEditCard}`} style={{ cursor: "default", borderLeft: borderColor ? `4px solid ${borderColor}` : undefined }}>
        <div className={styles.cardHeader}>
          <div className={styles.cardTitle}>{icon}{title}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className={styles.editHintIcon}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></div>
          </div>
        </div>
        <div className={styles.previewContent}>
          <BulletListEditor field={field} items={items} placeholder={placeholder} updateField={updateField} autoSaveStatus={autoSaveStatus} setAutoSaveStatus={setAutoSaveStatus} suggestTimer={suggestTimer} activeSuggestion={activeSuggestion} setActiveSuggestion={setActiveSuggestion} fetchSmartSuggestion={fetchSmartSuggestion} />
        </div>
      </div>
    );
  };

  if (clinicLoading) return null;

  return (
    <>
      {toast && <div className={styles.toast} role="alert">{toast}</div>}
      <div className={styles.page}>
        <TopBar 
          title="Discharge Summary" 
          backHref={`/portal/doctor-dashboard${searchParams.get("doctorId") ? `?doctorId=${searchParams.get("doctorId")}&doctorName=${encodeURIComponent(searchParams.get("doctorName") || searchParams.get("docName") || "")}` : ""}`}
        />
        
        <div className={styles.workspaceHeader}>
          <div className={styles.headerLeft}>
            {summary.patientName ? (
              <div className={styles.stickyPatientHeader} style={{ position: "static", top: "auto", borderBottom: "none", padding: 0, background: "transparent", zIndex: 1 }}>
                <div className={styles.stickyPatientInner}>
                  <div className={styles.stickyPatientPill}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                    <span className={styles.stickyPatientName}>{summary.patientName || "—"}</span>
                  </div>
                  {summary.age && <div className={styles.stickyPatientChip}><span className={styles.stickyChipLabel}>Age</span><span>{summary.age} {summary.ageUnit} / {summary.sex || "M"}</span></div>}
                  {summary.doctor && <div className={styles.stickyPatientChip}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg><span>Dr. {summary.doctor}</span></div>}
                </div>
              </div>
            ) : (
              <div className={styles.headerTitles}>
                <h1 style={{ fontSize: 24 }}>Discharge Summary</h1>
              </div>
            )}
          </div>
          <div className={styles.headerRight}>
            <button className={styles.btnActionSecondary} onClick={() => { localStorage.setItem("discharge_summary_draft", JSON.stringify(summary)); showToast("Draft saved successfully"); }}>Save Draft</button>
            {step > 1 && (
              <button className={styles.btnActionSecondary} onClick={() => handleSetStep(s => s - 1)}>Back</button>
            )}
            {step < 3 ? (
              <button className={styles.btnActionPrimary} onClick={() => handleSetStep(s => s + 1)}>Continue to Next Step</button>
            ) : (
              <button className={styles.btnActionPrimary} onClick={handleFinalSubmit} disabled={isSaving}>{isSaving ? "Finalizing..." : "Preview Summary"}</button>
            )}
          </div>
        </div>

        {renderWizardProgress()}

        <main className={styles.main}>
          <div className={styles.layout} style={step === 3 ? { gridTemplateColumns: "1fr" } : {}}>
            <section className={styles.fullWidthSection} style={{ display: step === 1 ? "flex" : "none" }}>
              <div className={styles.stepFadeIn}>
                <div className={styles.premiumCard}>
                  <div className={styles.cardHeader}>
                    <div className={styles.cardTitle}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                      Patient & Admission Details
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div className="field"><label>Full Name</label><input type="text" placeholder="e.g. John Doe" value={summary.patientName} onChange={(e) => updateField("patientName", e.target.value.replace(/[^a-zA-Z\s]/g, ''))} /></div>
                    
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                      <div className="field">
                        <label>Age</label>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <input 
                            type="text" 
                            inputMode="numeric" 
                            placeholder="e.g. 45" 
                            value={summary.age} 
                            onChange={(e) => {
                              let val = e.target.value.replace(/\D/g, '');
                              if (parseInt(val) > 120) val = "120";
                              updateField("age", val);
                            }} 
                            style={{ flex: 1 }}
                          />
                          <select 
                            value={summary.ageUnit} 
                            onChange={(e) => updateField("ageUnit", e.target.value)}
                            style={{ width: "110px", padding: "10px", borderRadius: "10px", border: "1px solid var(--border, #e2e8f0)", background: "#f8fafc" }}
                          >
                            <option value="Years">Years</option>
                            <option value="Months">Months</option>
                            <option value="Days">Days</option>
                          </select>
                        </div>
                      </div>
                      <div className="field">
                        <label>Sex</label>
                        <select value={summary.sex} onChange={(e) => updateField("sex", e.target.value)}>
                          <option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                      <div className="field"><label>Phone Number</label><input type="text" inputMode="numeric" maxLength={11} placeholder="e.g. 98765 43210" value={summary.phone ? (summary.phone.length > 5 ? `${summary.phone.slice(0, 5)} ${summary.phone.slice(5, 10)}` : summary.phone) : ""} onChange={(e) => updateField("phone", e.target.value.replace(/\D/g, '').slice(0, 10))} /></div>
                      <div className="field"><label>IPD / Reg No.</label><input type="text" placeholder="e.g. IPD-2023-001" value={summary.regNo} onChange={(e) => updateField("regNo", e.target.value)} /></div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "24px" }}>
                      <div className="field"><label>Discharge Destination</label><input type="text" placeholder="e.g. Home, Facility" value={summary.dischargeDestination} onChange={(e) => updateField("dischargeDestination", e.target.value)} /></div>
                      <div className="field"><label>Emergency Contact Relation</label><input type="text" placeholder="e.g. Spouse" value={summary.emergencyContactRelation} onChange={(e) => updateField("emergencyContactRelation", e.target.value)} /></div>
                      <div className="field"><label>Contact Number</label><input type="text" inputMode="numeric" maxLength={10} placeholder="e.g. 9876543210" value={summary.emergencyContactNumber} onChange={(e) => updateField("emergencyContactNumber", e.target.value.replace(/\D/g, '').slice(0, 10))} /></div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "24px" }}>
                      <div className="field"><label>Date of Admission</label><input type="datetime-local" value={summary.doa} onChange={(e) => updateField("doa", e.target.value)} /></div>
                      <div className="field"><label>Date of Discharge</label><input type="datetime-local" value={summary.dod} onChange={(e) => updateField("dod", e.target.value)} /></div>
                      <div className="field">
                        <label>Length of Stay</label>
                        <div style={{ padding: "10px 14px", background: "var(--sanctuary-gray-low, #f8fafc)", borderRadius: "10px", border: "1px solid var(--border, #e2e8f0)", color: "var(--sanctuary-ink, #0f172a)", fontWeight: 600, fontSize: "14px", height: "42px", display: "flex", alignItems: "center" }}>
                          {calculateLengthOfStay(summary.doa, summary.dod)}
                        </div>
                      </div>
                    </div>

                    <div className="field"><label>Consultant / Doctor</label><input type="text" placeholder="e.g. Dr. Smith" value={summary.doctor} onChange={(e) => updateField("doctor", e.target.value)} /></div>
                    
                    <div style={{ marginTop: 16 }}>
                      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: "var(--sanctuary-primary, #6366f1)" }}>Care Team</h3>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: 16 }}>
                        <div className="field"><label>Primary Attending Physician (Name & Contact)</label><input type="text" placeholder="e.g. Dr. Smith (555-0123)" value={summary.attendingPhysician} onChange={(e) => updateField("attendingPhysician", e.target.value)} /></div>
                        <div className="field"><label>Discharging Nurse (Name & Contact)</label><input type="text" placeholder="e.g. Nurse Sarah (555-0124)" value={summary.dischargingNurse} onChange={(e) => updateField("dischargingNurse", e.target.value)} /></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className={styles.fullWidthSection} style={{ display: step === 2 ? "flex" : "none" }}>
              <div className={styles.stepFadeIn}>
                <div className={styles.premiumCard}>
                  <div className={styles.summaryCard} style={{ borderLeft: '4px solid #ef4444' }}>
                    <div className={styles.cardHeader}><div className={styles.cardTitle}><span style={{ fontSize: '18px', marginRight: '6px' }}>🩺</span>Diagnosis</div></div>
                    <div className={styles.field}>
                        <input
                        type="text"
                        placeholder="e.g. Acute Gastroenteritis with severe dehydration"
                        value={summary.diagnosis}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateField("diagnosis", val);
                          const filtered = DIAGNOSIS_OPTIONS.filter((opt) =>
                            opt.toLowerCase().includes(val.toLowerCase())
                          );
                          setFilteredDiagnosisOptions(filtered);
                          setShowDiagnosisDropdown(true);
                        }}
                        onFocus={() => {
                          setFilteredDiagnosisOptions(DIAGNOSIS_OPTIONS);
                          setShowDiagnosisDropdown(true);
                        }}
                        onBlur={() => setShowDiagnosisDropdown(false)}
                        style={{ fontWeight: 600, fontSize: 16 }}
                      />
                      {showDiagnosisDropdown && filteredDiagnosisOptions.length > 0 && (
                        <ul className={styles.dropdown}>
                          {filteredDiagnosisOptions.map((opt) => (
                            <li
                              key={opt}
                              onMouseDown={() => {
                                updateField("diagnosis", opt);
                                setShowDiagnosisDropdown(false);
                              }}
                            >
                              {opt}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                  {renderClinicalCard("Chief Complaints", "complaints", <span style={{ fontSize: '18px', marginRight: '6px' }}>📋</span>, "e.g. High grade fever since 5 days", "#3b82f6")}
                  {renderClinicalCard("Examination", "findings", <span style={{ fontSize: '18px', marginRight: '6px' }}>🩻</span>, "e.g. Patient conscious, oriented, PR: 98/min", "#f59e0b")}
                </div>
              </div>
            </section>

            <section className={styles.fullWidthSection} style={{ display: step === 3 ? "flex" : "none" }}>
              <div className={styles.stepFadeIn}>
                <div className={styles.premiumCard}>
                  {renderClinicalCard("Treatment Given During Stay", "treatment", <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>, "e.g. IV fluids started...")}
                  <div className={styles.summaryCard}>
                    <div className={styles.cardHeader}><div className={styles.cardTitle}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5"><path d="M10.5 20.5l-6-6a4.5 4.5 0 0 1 6.5-6.5l6 6a4.5 4.5 0 0 1-6.5 6.5z"/><path d="M14 6l4 4"/><path d="M7 13l4 4"/></svg>Discharge Medications</div></div>
                    <MedicationRepeater items={summary.medicines} onChange={(val: any) => updateField("medicines", val)} />
                  </div>
                  {renderClinicalCard("Condition at Discharge", "dischargeCondition", <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>, "e.g. Vitals stable, patient conscious")}
                  {renderClinicalCard("Advice & Follow-up", "advice", <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>, "e.g. Review after 5 days in OPD")}
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </>
  );
}
