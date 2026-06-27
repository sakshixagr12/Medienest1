"use client";

import React, { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TopBar from "@/components/TopBar";
import { useClinic } from "@/context/ClinicContext";
import { createClient } from "@/lib/supabase/client";
import styles from "./page.module.css";
import { EXAMINATION_TEMPLATES, MUTUALLY_EXCLUSIVE_GROUPS, FINDING_SHORT_LABELS, NORMAL_FINDINGS, ABNORMAL_FINDINGS } from "./constants/examinationTemplates";

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
  emergencyContactName: string;
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

const PREDEFINED_CONDITIONS = [
  "Conscious", "Hemodynamically Stable", "Afebrile", "Ambulatory", "Oxygen Support Required", "Wound Healing Well"
];

const ExaminationEditor = ({ items, onChange }: any) => {
  const [selectedDept, setSelectedDept] = useState("Medicine");
  
  const template = EXAMINATION_TEMPLATES.find(t => t.name === selectedDept) || EXAMINATION_TEMPLATES[0];
  const predefinedInCurrentTemplate = new Set(template.categories.flatMap(c => c.findings));
  
  const predefinedSelected = items.filter((i: string) => predefinedInCurrentTemplate.has(i));
  const customItems = items.filter((i: string) => !predefinedInCurrentTemplate.has(i));
  
  const hasRealCustom = customItems.some((i: string) => i !== "");
  const [showCustom, setShowCustom] = useState(hasRealCustom);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (customItems.some((i: string) => i !== "")) setShowCustom(true);
  }, [items]);
  
  const togglePredefined = (finding: string) => {
    let next = [...items];
    if (next.includes(finding)) {
      next = next.filter((i: string) => i !== finding);
      if (next.length === 0) next = [""];
    } else {
      const group = MUTUALLY_EXCLUSIVE_GROUPS.find(g => g.includes(finding));
      if (group) {
        next = next.filter(i => !group.includes(i));
      }
      next.push(finding);
      next = next.filter((i: string) => i !== "");
    }
    onChange(next);
  };

  const updateCustom = (idx: number, val: string) => {
    const newCustom = [...customItems];
    newCustom[idx] = val;
    onChange([...predefinedSelected, ...newCustom]);
  };
  
  const addCustom = () => {
    setShowCustom(true);
    if (customItems.length === 0 || customItems[customItems.length - 1] !== "") {
      onChange([...items, ""]);
      setTimeout(() => inputRefs.current[customItems.length]?.focus(), 0);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent, idx: number, item: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addCustom();
    } else if (e.key === "Backspace" && item === "" && customItems.length > 1) {
      e.preventDefault();
      removeCustom(idx);
      setTimeout(() => inputRefs.current[idx - 1]?.focus(), 0);
    }
  };

  const removeCustom = (idx: number) => {
    const newCustom = customItems.filter((_: any, i: number) => i !== idx);
    let next = [...predefinedSelected, ...newCustom];
    if (next.length === 0) {
      next = [""];
      setShowCustom(false);
    }
    onChange(next);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--sanctuary-ink-l)" }}>Template:</span>
        <select 
          value={selectedDept} 
          onChange={e => setSelectedDept(e.target.value)}
          style={{ padding: "6px 12px", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "14px", background: "white", outline: "none", cursor: "pointer" }}
        >
          {EXAMINATION_TEMPLATES.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
        </select>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {template.categories.map(cat => {
          const isExpanded = expandedCategories[cat.categoryName];
          const chipsToShow = isExpanded ? cat.findings : cat.findings.slice(0, 5);
          const hasMore = cat.findings.length > 5;
          
          return (
          <div key={cat.categoryName}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--sanctuary-ink-l)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>{cat.categoryName}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {chipsToShow.map(finding => {
                const isSelected = items.includes(finding);
                let displayLabel = FINDING_SHORT_LABELS[finding] || finding;
                
                const isNormal = NORMAL_FINDINGS.has(finding);
                const isAbnormal = ABNORMAL_FINDINGS.has(finding);
                
                if (isNormal) displayLabel = "🟢 " + displayLabel;
                else if (isAbnormal) displayLabel = "🔴 " + displayLabel;
                
                let bg = "var(--sanctuary-gray-low)";
                let borderColor = "var(--border)";
                let color = "var(--sanctuary-ink)";
                
                if (isSelected) {
                  if (isNormal) {
                    bg = "#dcfce7";
                    borderColor = "#22c55e";
                    color = "#166534";
                  } else if (isAbnormal) {
                    bg = "#fee2e2";
                    borderColor = "#ef4444";
                    color = "#991b1b";
                  } else {
                    bg = "#eff6ff";
                    borderColor = "#3b82f6";
                    color = "#1e40af";
                  }
                }

                return (
                  <label key={finding} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", background: bg, padding: "6px 12px", borderRadius: "16px", border: `1px solid ${borderColor}`, color: color, transition: "all 0.2s" }}>
                    <input type="checkbox" checked={isSelected} onChange={() => togglePredefined(finding)} style={{ display: "none" }} />
                    <span style={{ fontSize: "13px", fontWeight: 500 }}>{displayLabel}</span>
                  </label>
                );
              })}
              {hasMore && (
                <button 
                  onClick={() => setExpandedCategories(p => ({ ...p, [cat.categoryName]: !p[cat.categoryName] }))}
                  style={{ background: "none", border: "1px dashed #cbd5e1", borderRadius: "16px", padding: "6px 12px", fontSize: "13px", fontWeight: 600, color: "#64748b", cursor: "pointer", transition: "all 0.2s" }}
                >
                  {isExpanded ? "Show Less" : `+ More ${cat.categoryName}`}
                </button>
              )}
            </div>
          </div>
        )})}
      </div>

      {predefinedSelected.length > 0 && (
        <div style={{ marginTop: "8px", padding: "16px", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--sanctuary-ink-l)", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Selected Findings Preview</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {predefinedSelected.map(finding => {
              const isNormal = NORMAL_FINDINGS.has(finding);
              const isAbnormal = ABNORMAL_FINDINGS.has(finding);
              let displayLabel = FINDING_SHORT_LABELS[finding] || finding;
              if (isNormal) displayLabel = "🟢 " + displayLabel;
              else if (isAbnormal) displayLabel = "🔴 " + displayLabel;

              let bg = "#eff6ff";
              let borderColor = "#3b82f6";
              let color = "#1e40af";
              if (isNormal) {
                bg = "#dcfce7"; borderColor = "#22c55e"; color = "#166534";
              } else if (isAbnormal) {
                bg = "#fee2e2"; borderColor = "#ef4444"; color = "#991b1b";
              }

              return (
                <button
                  key={finding}
                  onClick={() => togglePredefined(finding)}
                  title="Click to remove"
                  style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", background: bg, padding: "6px 12px", borderRadius: "16px", border: `1px solid ${borderColor}`, color: color, fontSize: "13px", fontWeight: 500 }}
                >
                  {displayLabel} <span style={{ opacity: 0.6, fontSize: "10px", marginLeft: "2px" }}>✕</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      
      <div className={styles.bulletListContainer}>
        <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--sanctuary-ink-l)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Custom Findings</div>
        {customItems.map((item: string, idx: number) => {
          if (!showCustom && item === "") return null;

          return (
            <div key={idx} className={styles.bulletRow}>
              <div className={styles.bulletMarker} />
              <div className={styles.inputWrapper}>
                <input
                  ref={(el) => { inputRefs.current[idx] = el; }}
                  className={styles.bulletInput}
                  value={item}
                  onChange={(e) => updateCustom(idx, e.target.value)}
                  onKeyDown={(e) => onKeyDown(e, idx, item)}
                  placeholder="e.g. Bilateral basal crepitations"
                />
              </div>
              {customItems.length > 1 && (
                <button
                  className={styles.btnRemovePoint}
                  onClick={() => removeCustom(idx)}
                  title="Remove custom finding"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              )}
            </div>
          );
        })}
        
        <button
          className={styles.btnAddPoint}
          onClick={() => { addCustom(); setTimeout(() => inputRefs.current[customItems.length]?.focus(), 0); }}
        >
          + Add Custom Finding
        </button>
      </div>
    </div>
  );
};

const DischargeConditionEditor = ({ items, onChange }: any) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const predefinedSelected = items.filter((i: string) => PREDEFINED_CONDITIONS.includes(i));
  const customItems = items.filter((i: string) => !PREDEFINED_CONDITIONS.includes(i));
  const hasRealCustom = customItems.some((i: string) => i !== "");
  const [showCustom, setShowCustom] = useState(hasRealCustom);

  useEffect(() => {
    if (customItems.some((i: string) => i !== "")) setShowCustom(true);
  }, [items]);
  
  const togglePredefined = (cond: string) => {
    let next = [...items];
    if (next.includes(cond)) {
      next = next.filter((i: string) => i !== cond);
      if (next.length === 0) next = [""];
    } else {
      next.push(cond);
      next = next.filter((i: string) => i !== "");
    }
    onChange(next);
  };

  const updateCustom = (idx: number, val: string) => {
    const newCustom = [...customItems];
    newCustom[idx] = val;
    onChange([...predefinedSelected, ...newCustom]);
  };
  
  const addCustom = () => {
    setShowCustom(true);
    if (customItems.length === 0 || customItems[customItems.length - 1] !== "") {
      onChange([...items, ""]);
      setTimeout(() => inputRefs.current[customItems.length]?.focus(), 0);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent, idx: number, item: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addCustom();
    } else if (e.key === "Backspace" && item === "" && customItems.length > 1) {
      e.preventDefault();
      removeCustom(idx);
      setTimeout(() => inputRefs.current[idx - 1]?.focus(), 0);
    }
  };

  const removeCustom = (idx: number) => {
    const newCustom = customItems.filter((_: any, i: number) => i !== idx);
    let next = [...predefinedSelected, ...newCustom];
    if (next.length === 0) {
      next = [""];
      setShowCustom(false);
    }
    onChange(next);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
        {PREDEFINED_CONDITIONS.map(cond => {
          const isSelected = items.includes(cond);
          return (
            <label key={cond} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", background: isSelected ? "#eff6ff" : "var(--sanctuary-gray-low)", padding: "8px 12px", borderRadius: "8px", border: `1px solid ${isSelected ? "#3b82f6" : "var(--border)"}`, color: isSelected ? "#1e40af" : "var(--sanctuary-ink)", transition: "all 0.2s" }}>
              <input type="checkbox" checked={isSelected} onChange={() => togglePredefined(cond)} style={{ cursor: "pointer", width: "16px", height: "16px", accentColor: "#3b82f6" }} />
              <span style={{ fontSize: "14px", fontWeight: 500 }}>{cond}</span>
            </label>
          );
        })}
      </div>
      
      <div className={styles.bulletListContainer}>
        {customItems.map((item: string, idx: number) => {
          if (!showCustom && item === "") return null;

          return (
            <div key={idx} className={styles.bulletRow}>
              <div className={styles.bulletMarker} />
              <div className={styles.inputWrapper}>
                <input 
                  ref={(el) => { inputRefs.current[idx] = el; }}
                  className={styles.bulletInput} 
                  value={item} 
                  onChange={(e) => updateCustom(idx, e.target.value)} 
                  onKeyDown={(e) => onKeyDown(e, idx, item)}
                  placeholder="Type custom condition..." 
                />
              </div>
              <button className={styles.btnRemovePoint} onClick={() => removeCustom(idx)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" /></svg>
              </button>
            </div>
          );
        })}
        <button onClick={addCustom} className={styles.btnAddPoint} style={{ alignSelf: "flex-start", marginTop: "8px", background: "transparent", color: "#3b82f6", borderColor: "#3b82f6" }}>
          + Add Custom Condition
        </button>
      </div>
    </div>
  );
};

const generateAIAdvice = (category: string, diagnosis: string) => {
  const diag = (diagnosis || "").toLowerCase();
  let suggestions: string[] = [];

  if (category === "DIET") {
    suggestions = ["Normal Diet", "Soft Diet", "High Protein Diet", "High Fiber Diet"];
    if (diag.includes("diabet")) suggestions.push("Diabetic Diet", "Low Glycemic Index Diet");
    if (diag.includes("hypertension") || diag.includes("cardiac") || diag.includes("bp")) suggestions.push("Low Salt Diet", "Cardiac Diet");
    if (diag.includes("gastro") || diag.includes("diarrhea") || diag.includes("vomit")) suggestions.push("Bland Diet", "BRAT Diet");
  } else if (category === "FLUIDS") {
    suggestions = ["Maintain Adequate Hydration", "Increase Oral Fluids", "1.5L to 2L Water per Day"];
    if (diag.includes("gastro") || diag.includes("diarrhea") || diag.includes("dehydrat")) suggestions.push("ORS After Each Loose Stool", "Frequent Sips of Fluids");
    if (diag.includes("heart failure") || diag.includes("kidney") || diag.includes("renal") || diag.includes("ckd")) suggestions.push("Restrict Fluids to 1L/day", "Restrict Fluids to 1.5L/day", "Strict I/O Charting");
  } else if (category === "ACTIVITY") {
    suggestions = ["Resume Normal Activities", "Adequate Rest", "Avoid Heavy Lifting", "Avoid Strenuous Exercise for 1 Week"];
    if (diag.includes("fracture") || diag.includes("ortho") || diag.includes("surgery")) suggestions.push("Strict Bed Rest", "Weight Bearing As Tolerated", "Non-Weight Bearing", "Physiotherapy Exercises");
    if (diag.includes("respiratory") || diag.includes("pneumonia") || diag.includes("asthma")) suggestions.push("Breathing Exercises", "Incentive Spirometry");
  }

  return suggestions.sort(() => 0.5 - Math.random()).slice(0, 5);
};

const AIAssistedCategoryEditor = ({ category, categoryLabel, icon, items, onChange, diagnosis }: any) => {
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  useEffect(() => {
    if (aiSuggestions.length === 0) {
      setAiSuggestions(generateAIAdvice(category, diagnosis));
    }
  }, [category, diagnosis]);

  const regenerate = () => {
    setAiSuggestions(generateAIAdvice(category, diagnosis));
  };

  const catPrefix = `${category}: `;
  const absoluteIndices = items.map((val: string, idx: number) => val.startsWith(catPrefix) ? idx : -1).filter((idx: number) => idx !== -1);
  const myItemTexts = absoluteIndices.map((idx: number) => items[idx].substring(catPrefix.length));
  
  const selectedSet = new Set(myItemTexts);
  const customItems = myItemTexts.map((text: string, localIdx: number) => ({ text, absoluteIdx: absoluteIndices[localIdx] })).filter(item => !aiSuggestions.includes(item.text));

  const toggleItem = (text: string) => {
    const fullString = `${catPrefix}${text}`;
    let next = [...items];
    if (next.includes(fullString)) {
      next = next.filter((i: string) => i !== fullString);
    } else {
      next.push(fullString);
    }
    onChange(next);
  };

  const addCustom = () => {
    onChange([...items, `${catPrefix}`]);
    setTimeout(() => {
       const len = items.filter((i: string) => i.startsWith(catPrefix) && !aiSuggestions.includes(i.substring(catPrefix.length))).length;
       inputRefs.current[len]?.focus();
    }, 0);
  };

  const updateCustom = (absoluteIdx: number, newText: string) => {
    const next = [...items];
    next[absoluteIdx] = `${catPrefix}${newText}`;
    onChange(next);
  };

  const removeCustom = (absoluteIdx: number) => {
    const next = items.filter((_: string, idx: number) => idx !== absoluteIdx);
    onChange(next);
  };
  
  const removeCategory = () => {
    onChange(items.filter((i: string) => !i.startsWith(catPrefix)));
  };

  return (
    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px", position: "relative" }}>
      <button onClick={removeCategory} style={{ position: "absolute", top: "12px", right: "12px", background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>✕</button>
      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div style={{ fontWeight: 600, color: "#334155", display: "flex", alignItems: "center", gap: "8px", fontSize: "15px" }}>
          <span>{icon}</span> {categoryLabel} Advice
        </div>
      </div>
      
      <div style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <span style={{ fontSize: "13px", fontWeight: 700, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.5px" }}>✨ AI Suggestions</span>
          <button onClick={regenerate} style={{ background: "none", border: "none", color: "#3b82f6", fontSize: "13px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/></svg>
            Regenerate
          </button>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {aiSuggestions.map(sug => {
            const isSelected = selectedSet.has(sug);
            return (
              <label key={sug} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", background: isSelected ? "#eff6ff" : "white", padding: "6px 14px", borderRadius: "20px", border: `1px solid ${isSelected ? "#3b82f6" : "#cbd5e1"}`, color: isSelected ? "#1e40af" : "#475569", transition: "all 0.2s", fontSize: "13px", fontWeight: 500, boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
                <input type="checkbox" checked={isSelected} onChange={() => toggleItem(sug)} style={{ display: "none" }} />
                <div style={{ width: "14px", height: "14px", borderRadius: "4px", border: `2px solid ${isSelected ? "#3b82f6" : "#cbd5e1"}`, display: "flex", alignItems: "center", justifyContent: "center", background: isSelected ? "#3b82f6" : "transparent" }}>
                  {isSelected && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>}
                </div>
                {sug}
              </label>
            );
          })}
        </div>
      </div>

      <div style={{ borderTop: "1px dashed #cbd5e1", paddingTop: "16px", marginTop: "8px" }}>
        {customItems.length > 0 && (
           <div style={{ marginBottom: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
             {customItems.map((cItem, customLocalIdx) => (
               <div key={cItem.absoluteIdx} style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                 <div style={{ marginTop: "12px", width: "5px", height: "5px", borderRadius: "50%", background: "#94a3b8", flexShrink: 0 }} />
                 <input 
                   ref={(el) => { inputRefs.current[customLocalIdx] = el; }}
                   type="text" 
                   value={cItem.text} 
                   onChange={e => updateCustom(cItem.absoluteIdx, e.target.value)} 
                   placeholder={`Custom ${categoryLabel.toLowerCase()} advice...`}
                   style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px", background: "white" }} 
                 />
                 <button onClick={() => removeCustom(cItem.absoluteIdx)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                 </button>
               </div>
             ))}
           </div>
        )}
        <button onClick={addCustom} style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "1px dashed #cbd5e1", color: "#64748b", padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer", width: "100%", justifyContent: "center", transition: "all 0.2s" }} onMouseOver={e => e.currentTarget.style.background = "#f1f5f9"} onMouseOut={e => e.currentTarget.style.background = "none"}>
          + Add Custom {categoryLabel} Advice
        </button>
      </div>
    </div>
  );
};

const ADVICE_CATEGORIES = [
  { id: "FOLLOW-UP", label: "Follow-up", icon: "📅" },
  { id: "DIET", label: "Diet", icon: "🥗" },
  { id: "FLUIDS", label: "Fluids", icon: "💧" },
  { id: "ACTIVITY", label: "Activity", icon: "🏃" },
  { id: "WARNING_SIGNS", label: "Warning Signs", icon: "⚠️" },
  { id: "INVESTIGATION", label: "Investigation", icon: "🔬" },
  { id: "CUSTOM", label: "Custom", icon: "✍️" },
];

const AdviceEditor = ({ items, onChange, diagnosis }: any) => {
  const addCategory = (cat: string) => {
    onChange([...items, `${cat}: `]);
  };

  const updateItem = (idx: number, val: string) => {
    const next = [...items];
    next[idx] = val;
    onChange(next);
  };

  const removeItem = (idx: number) => {
    onChange(items.filter((_: any, i: number) => i !== idx));
  };

  const aiCategories = ["DIET", "FLUIDS", "ACTIVITY"];
  const activeAiCats = aiCategories.filter(cat => items.some((i: string) => i.startsWith(`${cat}: `)));
  
  const otherItems = items.map((val: string, idx: number) => ({ val, idx })).filter((item: any) => {
    const match = item.val.match(/^([A-Z_-]+):\s*(.*)$/);
    if (match && aiCategories.includes(match[1])) return false;
    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "8px" }}>
        {ADVICE_CATEGORIES.map(cat => (
          <button 
            key={cat.id} 
            onClick={() => addCategory(cat.id)}
            style={{ display: "flex", alignItems: "center", gap: "6px", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "20px", padding: "6px 12px", cursor: "pointer", color: "#334155", fontSize: "13px", fontWeight: 600, transition: "all 0.2s" }}
            onMouseOver={(e) => { e.currentTarget.style.background = "#e2e8f0"; e.currentTarget.style.borderColor = "#94a3b8"; }}
            onMouseOut={(e) => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.borderColor = "#cbd5e1"; }}
          >
            <span>{cat.icon}</span> + {cat.label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {activeAiCats.map(catId => {
          const catDef = ADVICE_CATEGORIES.find(c => c.id === catId)!;
          return <AIAssistedCategoryEditor key={catId} category={catId} categoryLabel={catDef.label} icon={catDef.icon} items={items} onChange={onChange} diagnosis={diagnosis} />;
        })}

        {otherItems.map(({ val: item, idx }) => {
          const match = item.match(/^([A-Z_-]+):\s*(.*)$/);
          const catId = match ? match[1] : "CUSTOM";
          let val = match ? match[2] : item;

          const catDef = ADVICE_CATEGORIES.find(c => c.id === catId) || ADVICE_CATEGORIES.find(c => c.id === "CUSTOM");

          if (catId === "FOLLOW-UP") {
            let num = "", unit = "Days", dept = "OPD";
            const fuMatch = val.match(/Review after (\d+)\s+([A-Za-z]+)\s+in\s+(.+?)\.?$/);
            if (fuMatch) {
              num = fuMatch[1];
              unit = fuMatch[2];
              dept = fuMatch[3];
            }
            return (
              <div key={idx} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px", position: "relative" }}>
                <button onClick={() => removeItem(idx)} style={{ position: "absolute", top: "12px", right: "12px", background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>✕</button>
                <div style={{ fontWeight: 600, color: "#334155", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}><span>{catDef?.icon}</span> {catDef?.label} Advice</div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                  <span style={{ color: "#475569", fontWeight: 500 }}>Review after:</span>
                  <input type="number" value={num} onChange={e => updateItem(idx, `FOLLOW-UP: Review after ${e.target.value} ${unit} in ${dept}.`)} style={{ width: "70px", padding: "8px", borderRadius: "8px", border: "1px solid #cbd5e1" }} />
                  <select value={unit} onChange={e => updateItem(idx, `FOLLOW-UP: Review after ${num} ${e.target.value} in ${dept}.`)} style={{ padding: "8px", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
                    <option value="Days">Days</option>
                    <option value="Weeks">Weeks</option>
                    <option value="Months">Months</option>
                  </select>
                  <span style={{ color: "#475569", fontWeight: 500, marginLeft: "8px" }}>Department:</span>
                  <select value={dept} onChange={e => updateItem(idx, `FOLLOW-UP: Review after ${num} ${unit} in ${e.target.value}.`)} style={{ padding: "8px", borderRadius: "8px", border: "1px solid #cbd5e1", flex: 1, minWidth: "150px" }}>
                    <option value="OPD">OPD</option>
                    <option value="Medicine OPD">Medicine OPD</option>
                    <option value="Surgery OPD">Surgery OPD</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>
              </div>
            );
          }

          return (
            <div key={idx} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px", position: "relative" }}>
              <button onClick={() => removeItem(idx)} style={{ position: "absolute", top: "12px", right: "12px", background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>✕</button>
              <div style={{ fontWeight: 600, color: "#334155", marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}><span>{catDef?.icon}</span> {catDef?.label} {catId !== "CUSTOM" && "Advice"}</div>
              <textarea 
                value={val} 
                onChange={e => updateItem(idx, (catId === "CUSTOM" && !item.startsWith("CUSTOM:")) ? e.target.value : `${catId}: ${e.target.value}`)}
                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", minHeight: "60px", resize: "vertical", fontFamily: "inherit" }}
                placeholder={`Type ${catDef?.label.toLowerCase()} advice here...`}
              />
            </div>
          );
        })}
      </div>
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
          <select 
            className={styles.iconInput} 
            style={{ padding: "0 12px" }} 
            value={med.frequency} 
            onChange={(e) => updateMed(i, "frequency", e.target.value)}
          >
            <option value="" disabled>Select Frequency</option>
            <option value="OD">OD</option>
            <option value="BD">BD</option>
            <option value="TDS">TDS</option>
            <option value="QID">QID</option>
            <option value="SOS">SOS</option>
          </select>
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
    patientName: "", phone: "", age: "", ageUnit: "Years", sex: "Male", regNo: "", dischargeDestination: "", emergencyContactName: "", emergencyContactRelation: "", emergencyContactNumber: "", doa: new Date().toISOString().slice(0, 16), dod: new Date().toISOString().slice(0, 16), doctor: "", attendingPhysician: "", dischargingNurse: "", diagnosis: "", complaints: [""], findings: [""], treatment: [""], dischargeCondition: [""], advice: [""], medicines: []
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
        discharge_destination: summary.dischargeDestination, emergency_contact_relation: summary.emergencyContactName ? `${summary.emergencyContactRelation} - ${summary.emergencyContactName}` : summary.emergencyContactRelation, emergency_contact_number: summary.emergencyContactNumber,
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
          {field === "dischargeCondition" ? (
            <DischargeConditionEditor items={items} onChange={(val: any) => updateField(field, val)} />
          ) : field === "advice" ? (
            <AdviceEditor items={items} onChange={(val: any) => updateField(field, val)} diagnosis={summary.diagnosis} />
          ) : (
            <BulletListEditor field={field} items={items} placeholder={placeholder} updateField={updateField} autoSaveStatus={autoSaveStatus} setAutoSaveStatus={setAutoSaveStatus} suggestTimer={suggestTimer} activeSuggestion={activeSuggestion} setActiveSuggestion={setActiveSuggestion} fetchSmartSuggestion={fetchSmartSuggestion} />
          )}
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

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
                      <div className="field"><label>Discharge Destination</label><input type="text" placeholder="e.g. Home, Facility" value={summary.dischargeDestination} onChange={(e) => updateField("dischargeDestination", e.target.value)} /></div>
                      <div className="field"><label>Emergency Contact Relation</label><input type="text" placeholder="e.g. Spouse" value={summary.emergencyContactRelation} onChange={(e) => updateField("emergencyContactRelation", e.target.value)} /></div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                      <div className="field"><label>Emergency Contact Name</label><input type="text" placeholder="e.g. John Doe" value={summary.emergencyContactName} onChange={(e) => updateField("emergencyContactName", e.target.value)} /></div>
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
                  {renderClinicalCard("Chief Complaints", "complaints", <span style={{ fontSize: '18px', marginRight: '6px' }}>📋</span>, "e.g. High grade fever since 5 days", "#3b82f6")}
                  
                  <div className={styles.summaryCard}>
                    <div className={styles.cardHeader}><div className={styles.cardTitle}><span style={{ fontSize: '18px', marginRight: '6px' }}>🩻</span>Examination Findings</div></div>
                    <ExaminationEditor items={summary.findings} onChange={(val: any) => updateField("findings", val)} />
                  </div>
                  <div className={styles.summaryCard} style={{ borderLeft: '4px solid #ef4444', backgroundColor: '#fef2f2', padding: '16px', borderRadius: '12px' }}>
                    <div className={styles.cardHeader}><div className={styles.cardTitle} style={{ color: '#b91c1c', fontWeight: 800, fontSize: '18px' }}><span style={{ fontSize: '20px', marginRight: '8px' }}>🩺</span>Final Diagnosis</div></div>
                    <div className={styles.field} style={{ marginTop: '8px' }}>
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
