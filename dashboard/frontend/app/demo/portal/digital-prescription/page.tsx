"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import { useClinic } from "@/context/ClinicContext";
import { createClient } from "@/lib/supabase/client";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { API_BASE_URL, authenticatedFetch } from "@/lib/api";
import styles from "./page.module.css";
import DemoPrescriptionTour from "@/components/demo/DemoPrescriptionTour";

interface Medicine {
  id: string;
  name: string;
  type: string;
  dose: string;
  freq: string;
  duration: string;
  instructions: string;
  note: string;
  tier?: "MUST" | "OPTIONAL";
  functionalGroup?: string;
  emoji?: string;
}

export default function PrescriptionPage() {
  const searchParams = useSearchParams();
  const { clinic, doctors } = useClinic();
  const [activeTab, setActiveTab] = useState<"info" | "rx">("info");
  const [isSaving, setIsSaving] = useState(false);
  const [savedRxId, setSavedRxId] = useState<string | null>(null);
  const rxPaperRef = useRef<HTMLDivElement>(null);

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [ptName, setPtName] = useState("");
  const [ptPhone, setPtPhone] = useState("");
  const [ptAge, setPtAge] = useState("");
  const [ptSex, setPtSex] = useState("Male");
  const [ptWeight, setPtWeight] = useState("");
  const [ptBloodGroup, setPtBloodGroup] = useState("");
  const [followUp, setFollowUp] = useState(""); // Stores Date string

  // Patient Search & Snapshot
  const [ptSuggestions, setPtSuggestions] = useState<any[]>([]);
  const [isLoadingPts, setIsLoadingPts] = useState(false);
  const [ptSnapshot, setPtSnapshot] = useState<any>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  // Premium Custom Alert Modal State
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "success" | "warning" | "error" | "info";
  } | null>(null);

  const showAlert = (message: string, type: "success" | "warning" | "error" | "info" = "warning", title?: string) => {
    const defaultTitles = {
      success: "Action Completed Successfully",
      warning: "Attention Required",
      error: "Error Occurred",
      info: "Information",
    };
    setModalConfig({
      isOpen: true,
      title: title || defaultTitles[type],
      message,
      type,
    });
  };

  const [cc, setCc] = useState("");
  const [findings, setFindings] = useState("");
  const [diagnosis, setDiagnosis] = useState("");

  const [meds, setMeds] = useState<Medicine[]>([]);
  const [advice, setAdvice] = useState("");

  // Med Form
  const [mName, setMName] = useState("");
  const [mType, setMType] = useState("Tab");
  const [mDose, setMDose] = useState("");
  const [mFreq, setMFreq] = useState("");
  const [mDur, setMDur] = useState("");
  const [showCustomDur, setShowCustomDur] = useState(false);
  const [mInst, setMInst] = useState("");
  const [mNote, setMNote] = useState("");

  // Medicine Database Suggestion Logic
  const [dbSuggestions, setDbSuggestions] = useState<any[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const skipSearchRef = useRef(false);
  const skipPtSearchRef = useRef(false);
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  if (!supabaseRef.current) supabaseRef.current = createClient();
  const supabase = supabaseRef.current;
  const guidancePaperRef = useRef<HTMLDivElement>(null);
  // Guidance Sheet State

  const [guidanceSheet, setGuidanceSheet] = useState<any>(null);
  const [guidanceStatus, setGuidanceStatus] = useState<{ [key: string]: 'pending' | 'accepted' | 'rejected' | 'editing' }>({});
  const [guidanceEditedTexts, setGuidanceEditedTexts] = useState<{ [key: string]: string }>({});
  const [isGeneratingGuidance, setIsGeneratingGuidance] = useState(false);
  const [guidanceError, setGuidanceError] = useState("");
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [guidanceApproved, setGuidanceApproved] = useState(false);


  // Draft Persistence (Cache) Logic
  useEffect(() => {
    const pId = searchParams.get("patientId") || "unlinked";
    const draftKey = `medienest care_rx_draft_${pId}`;
    const savedDraft = localStorage.getItem(draftKey);
    if (savedDraft) {
      setSelectedPatientId(pId === "unlinked" ? null : pId);
      try {
        const draft = JSON.parse(savedDraft);
        setPtName(draft.ptName || "");
        setPtPhone(draft.ptPhone || "");
        setPtAge(draft.ptAge || "");
        setPtSex(draft.ptSex || "Male");
        setPtWeight(draft.ptWeight || "");
        setPtBloodGroup(draft.ptBloodGroup || "");
        setCc(draft.cc || "");
        setFindings(draft.findings || "");
        setDiagnosis(draft.diagnosis || "");
        setMeds(draft.meds || []);
        setMName(draft.mName || "");
        setMType(draft.mType || "Tab");
        setMDose(draft.mDose || "");
        setMFreq(draft.mFreq || "");
        setMDur(draft.mDur || "");
        setMInst(draft.mInst || "");
        setMNote(draft.mNote || "");
        setAdvice(draft.advice || "");
        setFollowUp(draft.followUp || "");
        console.log("Draft restored from cache for patient:", pId);
      } catch (e) {
        console.error("Failed to restore draft:", e);
      }
    } else {
      // Clear form states when patientId changes and no draft exists
      if (searchParams.get("patientId")) {
        setPtName("");
        setPtPhone("");
        setPtAge("");
        setPtSex("Male");
        setPtWeight("");
        setPtBloodGroup("");
        setCc("");
        setFindings("");
        setDiagnosis("");
        setMeds([]);
        setMName("");
        setMType("Tab");
        setMDose("");
        setMFreq("");
        setMDur("");
        setMInst("");
        setMNote("");
        setAdvice("");
        setFollowUp("");
        setPtSnapshot(null);
        setSelectedPatientId(searchParams.get("patientId"));
      } else {
        setSelectedPatientId(null);
      }
    }
  }, [searchParams]);

  // 'Zero Latency' Auto-Fill from Deep-Link Params
  useEffect(() => {
    const pId = searchParams.get("patientId");
    const pName = searchParams.get("ptName");
    const pPhone = searchParams.get("ptPhone");
    const pAge = searchParams.get("ptAge");
    const pSex = searchParams.get("ptSex");
    const pBlood = searchParams.get("ptBloodGroup");

    if (pName) setPtName(pName);
    if (pPhone) setPtPhone(pPhone);
    if (pAge) setPtAge(pAge);
    if (pSex) setPtSex(pSex);
    if (pBlood) setPtBloodGroup(pBlood);

    if (!pId) return;

    const fetchPatientById = async () => {
      setIsLoadingPts(true);
      try {
        const { data, error } = await supabase
          .from("patients")
          .select("*")
          .eq("id", pId)
          .single();

        if (!error && data) {
          setSelectedPatientId(data.id);
          // Sync with DB values if they differ or weren't provided in URL
          if (!pName) setPtName(data.name || "");
          if (!pPhone) setPtPhone(data.contact || "");
          if (!pAge) setPtAge(data.age || "");
          if (!pSex) setPtSex(data.gender || "Male");
          if (!pBlood) setPtBloodGroup(data.blood_group || "");
          setPtWeight(data.weight || "");

          // Also fetch AI summary if available
          try {
            if (clinic?.id) {
              const res = await authenticatedFetch(
                `${API_BASE_URL}/api/patient-history/${data.id}?clinic_id=${clinic.id}`,
              );
              if (res.ok) {
                const historyData = await res.json();
                if (historyData && historyData.summary) {
                  setPtSnapshot(historyData.summary);
                }
              }
            }
          } catch (historyErr) {
            console.warn("Clinical history snapshot busy or unavailable.");
          }
        }
      } catch (err) {
        console.error("Error fetching patient by ID:", err);
      } finally {
        setIsLoadingPts(false);
      }
    };

    fetchPatientById();
  }, [searchParams, supabase, clinic?.id]);

  // Guidance Sheet Auto-Trigger Effect
  useEffect(() => {
    if (activeTab === "rx") {
      if ((diagnosis || cc) && !guidanceSheet && !isGeneratingGuidance && !guidanceApproved) {
        generateGuidance();
      }
    }
  }, [activeTab, diagnosis, cc, meds.length]);

  useEffect(() => {
    // If we've already officially saved this prescription to the DB, stop updating the draft.
    if (savedRxId) return;

    const draft = {
      ptName,
      ptPhone,
      ptAge,
      ptSex,
      ptWeight,
      ptBloodGroup,
      cc,
      findings,
      diagnosis,
      meds,
      mName,
      mType,
      mDose,
      mFreq,
      mDur,
      mInst,
      mNote,
      advice,
      followUp,
    };
    const pId = searchParams.get("patientId") || "unlinked";
    const draftKey = `medienest care_rx_draft_${pId}`;
    localStorage.setItem(draftKey, JSON.stringify(draft));
  }, [
    ptName,
    ptPhone,
    ptAge,
    ptSex,
    ptWeight,
    ptBloodGroup,
    cc,
    findings,
    diagnosis,
    meds,
    mName,
    mType,
    mDose,
    mFreq,
    mDur,
    mInst,
    mNote,
    advice,
    followUp,
    savedRxId,
    searchParams,
  ]);

  // Auto-Select Doctor (Backend logic remains for database attribution)
  const selectedDoctorObj =
    doctors.length === 1
      ? doctors[0]
      : doctors.find((d) => d.doctor_id === searchParams.get("doctorId") || d.id === searchParams.get("doctorId")) ||
        doctors.find((d) => d.name === searchParams.get("doctorName"));

  const handleNewRecord = async () => {
    if (await window.confirm("Clear current draft and start a new record?")) {
      const pId = searchParams.get("patientId") || "unlinked";
      localStorage.removeItem(`medienest care_rx_draft_${pId}`);
      setPtName("");
      setPtPhone("");
      setPtAge("");
      setPtSex("Male");
      setPtWeight("");
      setPtBloodGroup("");
      setCc("");
      setFindings("");
      setMeds([]);
      setAdvice("");
      setFollowUp("");
      setPtSnapshot(null);
    }
  };

  // Real-time Patient Lookup
  useEffect(() => {
    if (!ptPhone || ptPhone.length < 3) {
      setPtSuggestions([]);
      return;
    }

    if (skipPtSearchRef.current) {
      skipPtSearchRef.current = false;
      return;
    }

    const fetchPatients = async () => {
      setIsLoadingPts(true);
      const cleanSearch = ptPhone.replace(/\D/g, "").slice(-10);
      try {
        // 1. Try Clinic-Specific Search First
        let query = supabase
          .from("patients")
          .select("*")
          .ilike("contact", `%${cleanSearch}%`);
        if (clinic?.id) query.eq("clinic_id", clinic.id);

        let { data, error } = await query.limit(5);

        // 2. Fallback: Systematic Global Search (If clinic search fails for 10-digit input)
        if ((!data || data.length === 0) && cleanSearch.length === 10) {
          const globalResult = await supabase
            .from("patients")
            .select("*")
            .ilike("contact", `%${cleanSearch}%`)
            .limit(1);
          if (globalResult.data && globalResult.data.length > 0) {
            data = globalResult.data;
          }
        }

        if (!error && data) {
          setPtSuggestions(data);
          // AUTO-FETCH: If exactly one match and user typed 10 digits
          if (data.length === 1 && cleanSearch.length === 10) {
            handleSelectPatient(data[0]);
          }
        }
      } catch (err) {
        console.error("Error searching patients:", err);
      } finally {
        setIsLoadingPts(false);
      }
    };

    const debounce = setTimeout(fetchPatients, 300);
    return () => clearTimeout(debounce);
  }, [ptPhone]);

  const handleAddNewPatient = () => {
    skipPtSearchRef.current = true;
    setPtName("");
    setPtAge("");
    setPtSex("Male");
    setPtWeight("");
    setPtBloodGroup("");
    setCc("");
    setFindings("");
    setDiagnosis("");
    setMeds([]);
    setPtSnapshot(null);
    setPtSuggestions([]);
    setSelectedPatientId(null);
  };

  const handleSelectPatient = async (p: any) => {
    skipPtSearchRef.current = true;
    const cleanName = p.name ? p.name.toUpperCase() : "";
    const cleanPhone = p.contact ? p.contact.replace(/\D/g, "").slice(-10) : "";

    setPtName(cleanName);
    setPtPhone(cleanPhone);
    setPtAge(p.age || "");
    setPtSex(p.gender || "Male");
    setPtBloodGroup(p.blood_group || "");
    setPtSuggestions([]);
    setSelectedPatientId(p.id);

    // Fetch AI Snapshot for selected patient
    try {
      if (clinic?.id) {
        const res = await authenticatedFetch(
          `${API_BASE_URL}/api/patient-history/${p.id}?clinic_id=${clinic.id}`,
        );
        const data = await res.json();
        if (data && data.summary) {
          setPtSnapshot(data.summary);
        }
      } else {
        console.warn("No clinic ID available for fetching patient history");
      }
    } catch (err) {
      console.error("Error fetching patient snapshot:", err);
    }
  };

  useEffect(() => {
    if (!mName || mName.length < 2) {
      setDbSuggestions([]);
      return;
    }

    if (skipSearchRef.current) {
      skipSearchRef.current = false;
      return;
    }

    const fetchSuggestions = async () => {
      setIsLoadingSuggestions(true);
      try {
        // Call the search_medicines RPC function
        const { data, error } = await supabase.rpc("search_medicines", {
          search_term: mName,
        });

        if (!error && data) {
          setDbSuggestions(data);
        }
      } catch (err) {
        console.error("Error fetching suggestions:", err);
      } finally {
        setIsLoadingSuggestions(false);
      }
    };

    const debounce = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounce);
  }, [mName]);

  const handleSelectMedicine = (med: any) => {
    skipSearchRef.current = true;
    setMName(med.name);
    if (med.category) setMType(med.category);
    if (med.strength) setMDose(med.strength);
    setDbSuggestions([]); // Hide suggestions after selection
  };

  const addMed = () => {
    if (!mName) return;

    // Sanitize 'None' values back to empty strings for the final Rx
    const finalFreq = mFreq === "None" ? "" : mFreq;
    const finalDur = mDur === "None" ? "" : mDur;
    const finalInst = mInst === "None" ? "" : mInst;

    setMeds([
      ...meds,
      {
        id: Date.now().toString(),
        name: mName,
        type: mType,
        dose: mDose,
        freq: finalFreq,
        duration: finalDur,
        instructions: finalInst,
        note: mNote,
      },
    ]);
    setMName("");
    setMDose("");
    setMNote("");
    setMFreq("");
    setMDur("");
    setShowCustomDur(false);
    setMInst("");
    setDbSuggestions([]);
  };

  const commonCC = [
    "Fever",
    "Cough",
    "Cold",
    "Loose Motion",
    "Vomiting",
    "Body Ache",
    "Weakness",
  ];
  const commonAdvice = [
    "Drink plenty of fluids",
    "Rest for 2-3 days",
    "Light diet",
    "Monitor temperature",
    "Follow-up if fever persists",
  ];

  const removeMed = (id: string) => {
    setMeds(meds.filter((m) => m.id !== id));
  };

  const handleSave = async (overrideGuidance: any = false) => {
    const isOverride = overrideGuidance === true;
    // If guidance exists but isn't approved, prompt doctor to review/approve first
    if (guidanceSheet && !guidanceApproved && !isOverride) {
      setIsReviewModalOpen(true);
      return;
    }
    if (!ptName || !ptPhone) {
      showAlert("Please enter patient name and contact details.", "warning", "Validation Warning");
      return;
    }
    if (!selectedDoctorObj) {
      showAlert("Please select a consulting doctor from the dropdown list.", "warning", "Consultant Required");
      return;
    }

    setIsSaving(true);
    const supabase = createClient();

    // STRICT SANITIZATION: Clean phone number to exactly 10 digits for DB constraint
    const cleanPhone = ptPhone.replace(/\D/g, "").slice(-10);
    if (cleanPhone.length !== 10) {
      showAlert("Please enter a valid 10-digit phone number.", "warning", "Invalid Contact Number");
      setIsSaving(false);
      return;
    }

    try {
      let patientId: string;
      const normalizedName = ptName.trim().toUpperCase();
      const { data: existing, error: pError } = await supabase
        .from("patients")
        .select("id")
        .eq("name", normalizedName)
        .eq("contact", cleanPhone)
        .limit(1);

      if (pError) throw pError;

      if (existing && existing.length > 0) {
        patientId = existing[0].id;
        await supabase
          .from("patients")
          .update({
            age: ptAge,
            gender: ptSex,
            clinic_id: clinic?.id,
            contact: cleanPhone,
            blood_group: ptBloodGroup,
          })
          .eq("id", patientId);
      } else {
        const { data: neu, error: cError } = await supabase
          .from("patients")
          .insert([
            {
              name: normalizedName,
              contact: cleanPhone,
              age: ptAge,
              gender: ptSex,
              clinic_id: clinic?.id,
              blood_group: ptBloodGroup,
            },
          ])
          .select()
          .single();
        if (cError) throw cError;
        patientId = neu.id;
      }

      // Format follow-up date for display
      const displayFollowUp = followUp
        ? new Date(followUp).toLocaleDateString("en-IN")
        : "";
      const finalAdvice = displayFollowUp
        ? `${advice}\n\n[REVISIT DATE: ${displayFollowUp}]`
        : advice;

      // Insert prescription and return share_id
      const { data: pData, error } = await supabase
        .from("prescriptions")
        .insert([
          {
            patient_id: patientId,
            doctor_id: selectedDoctorObj?.doctor_id || selectedDoctorObj?.id || null,
            complaints: cc,
            findings: findings,
            diagnosis: diagnosis,
            medicines: JSON.stringify(
              meds.map((m) => ({
                type: m.type,
                name: m.name,
                dose: m.dose,
                freq: m.freq,
                dur: m.duration,
                inst: m.instructions,
                note: m.note,
              })),
            ),
            advice: finalAdvice,
            date: date,
            weight: ptWeight,
            clinic_id: clinic?.id,
            doctor_name: selectedDoctorObj?.name || "Dr. Consultant",
            valid_till: followUp || null,
            guidance_sheet: guidanceApproved && guidanceSheet ? {
              understanding_condition: {
                title: guidanceSheet.understanding_condition?.title || "Understanding Your Condition",
                disease_name: guidanceSheet.understanding_condition?.disease_name || diagnosis,
                points: guidanceStatus.understanding_condition === 'accepted'
                  ? (guidanceEditedTexts.understanding_condition 
                      ? guidanceEditedTexts.understanding_condition.split("\n").filter(Boolean).filter((l: string) => !l.toLowerCase().includes("diagnosis:"))
                      : [])
                  : []
              },
              diet_nutrition: {
                title: guidanceSheet.diet_nutrition?.title || "Diet & Nutrition",
                points: guidanceStatus.diet_nutrition === 'accepted'
                  ? (guidanceEditedTexts.diet_nutrition ? guidanceEditedTexts.diet_nutrition.split("\n").filter(Boolean) : [])
                  : []
              },
              hydration: {
                title: guidanceSheet.hydration?.title || "Water & Hydration",
                points: guidanceStatus.hydration === 'accepted'
                  ? (guidanceEditedTexts.hydration ? guidanceEditedTexts.hydration.split("\n").filter(Boolean).filter((l: string) => !l.toLowerCase().includes("tip:")) : [])
                  : [],
                tip: guidanceSheet.hydration?.tip || ""
              },
              activity_exercise: {
                title: guidanceSheet.activity_exercise?.title || "Activity & Exercise",
                points: guidanceStatus.activity_exercise === 'accepted'
                  ? (guidanceEditedTexts.activity_exercise ? guidanceEditedTexts.activity_exercise.split("\n").filter(Boolean).filter((l: string) => !l.toLowerCase().includes("tip:")) : [])
                  : [],
                tip: guidanceSheet.activity_exercise?.tip || ""
              },
              things_to_avoid: {
                title: guidanceSheet.things_to_avoid?.title || "Things To Avoid",
                items: guidanceStatus.things_to_avoid === 'accepted'
                  ? (guidanceEditedTexts.things_to_avoid
                      ? guidanceEditedTexts.things_to_avoid.split("\n").filter(Boolean).map((line: string) => {
                          const parts = line.split(":");
                          return {
                            text: parts[0]?.replace(/^-\s*/, '')?.trim() || "",
                            reason: parts.slice(1).join(":")?.trim() || ""
                          };
                        })
                      : [])
                  : []
              },
              warning_signs: {
                title: guidanceSheet.warning_signs?.title || "Warning Signs & Follow-up",
                red_flags: guidanceStatus.warning_signs === 'accepted'
                  ? (guidanceEditedTexts.warning_signs ? guidanceEditedTexts.warning_signs.split("\n").filter(Boolean).filter((l: string) => !l.toLowerCase().includes("follow-up:") && !l.toLowerCase().includes("red flags:")) : [])
                  : [],
                follow_up: guidanceStatus.warning_signs === 'accepted'
                  ? (guidanceEditedTexts.warning_signs?.split("\n").find((l: string) => l.toLowerCase().includes("follow-up:"))?.replace(/^follow-up:\s*/i, '') || guidanceSheet.warning_signs?.follow_up || "")
                  : ""
              },
              general_tips: guidanceSheet.general_tips || []
            } : null
          },
        ])
        .select("id")
        .single();

      if (error) throw error;

      // 2. MARK AS DONE IN QUEUE (Operational Sync)
      // If we launched from the dashboard/queue, mark the entry as complete
      if (patientId) {
        const { error: queueError } = await supabase
          .from("doctor_queue")
          .update({
            status: "done",
            completed_at: new Date().toISOString(),
          })
          .eq("patient_id", patientId)
          .eq("queue_date", date)
          .eq("clinic_id", clinic?.id);

        if (queueError) console.warn("Queue Sync Warning:", queueError.message);
      }

      // Update local ID for use in sharing
      if (pData?.id) {
        setSavedRxId(pData.id);
      }

      // 3. RESET DRAFT (Clear the auto-save cache for this patient so it starts fresh next time)
      const thisPatientId = searchParams.get("patientId") || "unlinked";
      localStorage.removeItem(`medienest care_rx_draft_${thisPatientId}`);

      showAlert(
        "Prescription saved successfully! Patient has been marked as completed in the queue.\n\nYou can now export the PDF or share it directly via WhatsApp.",
        "success",
        "Prescription Saved"
      );
    } catch (err: any) {
      console.error("Save error:", err);
      showAlert("Could not save prescription: " + (err.message || "Please check database permissions and try again."), "error", "Database Error");
    } finally {
      setIsSaving(false);
    }
  };

  const generateGuidance = async () => {
    if (isGeneratingGuidance || guidanceApproved) return;
    setIsGeneratingGuidance(true);
    setGuidanceError("");
    try {
      const treatmentText = meds.length > 0
        ? meds.map(m => `${m.type || 'Tab'}. ${m.name} ${m.dose || ''} (${m.freq || ''}, ${m.duration || ''})`).join('; ')
        : "None prescribed yet";

      const res = await authenticatedFetch(
        `${API_BASE_URL}/api/recommendations/guidance-sheet`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            diagnosis,
            cc,
            findings,
            medicines: meds,
            age: ptAge,
            gender: ptSex,
            weight: ptWeight,
            existing_conditions: ptSnapshot ? [
              ...(ptSnapshot.keyConditions || []),
              ...(ptSnapshot.chronicFlags || []).map((f: string) => `[CHRONIC] ${f}`),
            ].join(", ") : "",
            follow_up_date: followUp,
            clinic_name: clinic?.name || "",
            doctor_name: selectedDoctorObj?.name || "",
          }),
        }
      );

      const data = await res.json();
      if (data.success && data.guidance) {
        setGuidanceSheet(data.guidance);
        const initialStatus: { [key: string]: 'pending' | 'accepted' | 'rejected' | 'editing' } = {};
        const initialTexts: { [key: string]: string } = {};

        const sections = [
          'understanding_condition',
          'diet_nutrition',
          'hydration',
          'activity_exercise',
          'things_to_avoid',
          'warning_signs'
        ];

        sections.forEach(sec => {
          initialStatus[sec] = 'pending';
          if (sec === 'understanding_condition') {
            const disease = data.guidance.understanding_condition.disease_name || diagnosis || "Condition";
            const pts = (data.guidance.understanding_condition.points || []).join("\n");
            initialTexts[sec] = `Diagnosis: ${disease}\n\n${pts}`;
          } else if (sec === 'things_to_avoid') {
            const items = (data.guidance.things_to_avoid.items || []).map((i: any) => `- ${i.text}: ${i.reason}`).join("\n");
            initialTexts[sec] = items;
          } else if (sec === 'warning_signs') {
            const redFlags = (data.guidance.warning_signs.red_flags || []).join("\n");
            const followUpTxt = data.guidance.warning_signs.follow_up || "";
            initialTexts[sec] = `Red Flags:\n${redFlags}\n\nFollow-up:\n${followUpTxt}`;
          } else {
            const pts = (data.guidance[sec].points || []).join("\n");
            const tip = data.guidance[sec].tip ? `\n\nTip: ${data.guidance[sec].tip}` : "";
            initialTexts[sec] = pts + tip;
          }
        });

        setGuidanceStatus(initialStatus);
        setGuidanceEditedTexts(initialTexts);
      } else {
        setGuidanceError(data.error || "Failed to generate patient guidance.");
      }
    } catch (err: any) {
      console.error("Guidance Sheet generation error:", err);
      setGuidanceError(err.message || "Failed to connect to AI server.");
    } finally {
      setIsGeneratingGuidance(false);
    }
  };

  const handleConfirmAndSaveGuidance = async (approvedGuidanceData: any) => {
    setGuidanceApproved(true);
    setIsReviewModalOpen(false);
    
    // Auto-save: Trigger handleSave immediately after setting guidance state.
    setTimeout(() => {
      handleSave(true);
    }, 100);
  };

  const shareWhatsApp = () => {
    if (!savedRxId && !ptName) {
      showAlert("Please save the prescription first to generate a secure sharing link.", "info", "Action Required");
      return;
    }

    const rawPhone = ptPhone.replace(/\D/g, "");
    let cleanPhone = rawPhone.length === 10 ? "91" + rawPhone : rawPhone;

    // Construct the public link
    const baseUrl = window.location.origin;
    const shareUrl = savedRxId
      ? `${baseUrl}/view/${savedRxId}`
      : "(Error: Save needed)";

    const displayFollowUp =
      followUp && !isNaN(new Date(followUp).getTime())
        ? new Date(followUp).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : "As advised";

    const msg =
      `*${clinic?.name || "MedieNest Clinic"}*\n` +
      `━━━━━━━━━━━━━━━\n` +
      `Hello *${ptName}*,\n\n` +
      `Your digital prescription from *Dr. ${selectedDoctorObj?.name || "Medical Officer"}* is ready. You can view it here:\n` +
      `${shareUrl}\n\n` +
      `*Follow-up Date:* ${displayFollowUp}\n` +
      `━━━━━━━━━━━━━━━\n` +
      `_Thank you for your visit!_ `;

    window.open(
      `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`,
      "_blank",
    );
  };

  const downloadImage = async () => {
    if (!rxPaperRef.current) return;
    const canvas = await html2canvas(rxPaperRef.current, { scale: 2 });
    const link = document.createElement("a");
    link.download = `Prescription_${ptName}_${date}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const downloadPDF = async () => {
    if (!rxPaperRef.current) return;
    setIsSaving(true);
    try {
      const canvas1 = await html2canvas(rxPaperRef.current, { scale: 2 });
      const imgData1 = canvas1.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      pdf.addImage(imgData1, "PNG", 0, 0, pdfWidth, pdfHeight);

      if (guidanceSheet && guidanceApproved && guidancePaperRef.current) {
        pdf.addPage();
        const canvas2 = await html2canvas(guidancePaperRef.current, { scale: 2 });
        const imgData2 = canvas2.toDataURL("image/png");
        pdf.addImage(imgData2, "PNG", 0, 0, pdfWidth, pdfHeight);
      }
      
      pdf.save(`Prescription_${ptName}_${date}.pdf`);
    } catch (pdfErr) {
      console.error("PDF generation failed:", pdfErr);
      showAlert("Could not generate PDF document.", "error", "Export Error");
    } finally {
      setIsSaving(false);
    }
  };

  const quickAdd = (setter: any, val: string) => {
    setter((prev: string) =>
      prev ? (prev.includes(val) ? prev : prev + ", " + val) : val,
    );
  };

  return (
    <div className={styles.page}>
      <TopBar
        title="Digital Prescription"
        backHref={`/demo/portal/doctor-dashboard${
          searchParams.get("doctorId")
            ? `?doctorId=${searchParams.get("doctorId")}&doctorName=${encodeURIComponent(
                searchParams.get("doctorName") || selectedDoctorObj?.name || ""
              )}`
            : ""
        }`}
      />

      <main className={styles.main}>
        <div className={styles.grid}>
          {/* Form Side */}
          <div className={styles.formPanel}>
            <div className={styles.tabs}>
              <button
                className={`${styles.tab} ${activeTab === "info" ? styles.tabActive : ""}`}
                onClick={() => setActiveTab("info")}
              >
                1. Patient & Vitals
              </button>
              <button
                className={`${styles.tab} ${activeTab === "rx" ? styles.tabActive : ""}`}
                onClick={() => setActiveTab("rx")}
              >
                2. Medicines & Advice
              </button>
            </div>

            {activeTab === "info" && (
              <div className={styles.tabContent}>
                <div className={styles.panelBlock}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "12px",
                    }}
                  >
                    <h3 className={styles.blockTitle} style={{ margin: 0 }}>
                      Patient Details
                    </h3>
                    <button
                      onClick={handleNewRecord}
                      className={styles.btnLink}
                      style={{
                        color: "#ef4444",
                        fontSize: "13px",
                        fontWeight: 600,
                      }}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        style={{ marginRight: 4 }}
                      >
                        <path d="M19 6L6 19M6 6l13 13" />
                      </svg>
                      New Record
                    </button>
                  </div>

                  {/* ── Queue-launched: show locked summary card ── */}
                  {searchParams.get("patientId") && ptName ? (
                    <div
                      style={{
                        background: "linear-gradient(135deg, #f0fdf4, #ecfdf5)",
                        border: "1.5px solid rgba(16,185,129,0.3)",
                        borderRadius: "16px",
                        padding: "16px 20px",
                        marginBottom: "16px",
                        display: "flex",
                        alignItems: "center",
                        gap: "14px",
                      }}
                    >
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: "12px",
                          background:
                            "linear-gradient(135deg, #10b981, #059669)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 22,
                          fontWeight: 800,
                          color: "#fff",
                          flexShrink: 0,
                        }}
                      >
                        {ptName[0]}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p
                          style={{
                            fontWeight: 800,
                            fontSize: 16,
                            color: "#065f46",
                            marginBottom: 2,
                          }}
                        >
                          {ptName}
                        </p>
                        <p
                          style={{
                            fontSize: 12,
                            color: "#6ee7b7",
                            fontWeight: 600,
                          }}
                        >
                          {ptAge ? `${ptAge} yrs` : ""}
                          {ptAge && ptSex ? " • " : ""}
                          {ptSex}
                          {ptBloodGroup ? ` • ${ptBloodGroup}` : ""}
                          {ptPhone ? ` • ${ptPhone}` : ""}
                          {ptWeight ? ` • ${ptWeight} kg` : ""}
                        </p>
                      </div>
                      <div
                        style={{
                          background: "#d1fae5",
                          color: "#065f46",
                          fontSize: 10,
                          fontWeight: 800,
                          padding: "4px 10px",
                          borderRadius: 20,
                          letterSpacing: 0.5,
                        }}
                      >
                        FROM QUEUE{" "}
                      </div>
                    </div>
                  ) : (
                    /* ── Manual entry: show phone search ── */
                    <div className="field" style={{ position: "relative" }}>
                      <label>Patient Phone Number</label>
                      <input
                        type="tel"
                        value={ptPhone}
                        onChange={(e) => {
                          const val = e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 10);
                          skipPtSearchRef.current = false;
                          setPtPhone(val);
                        }}
                        placeholder="10-digit contact number..."
                        autoComplete="off"
                        maxLength={10}
                        className={styles.mainSearchInput}
                      />
                      {ptSuggestions.length > 0 && (
                        <div
                          className={styles.suggestionsDropdown}
                          style={{ top: "100%", width: "100%" }}
                        >
                          {/* Add as New Patient Option */}
                          <div
                            className={styles.suggestionItem}
                            style={{
                              borderBottom:
                                "2px solid var(--sanctuary-lavender)",
                              backgroundColor: "var(--sanctuary-gray-low)",
                            }}
                            onClick={handleAddNewPatient}
                          >
                            <div className={styles.sugMain}>
                              <strong
                                style={{ color: "var(--sanctuary-primary)" }}
                              >
                                Add as New Patient (+)
                              </strong>
                              <span className={styles.sugCat}>
                                Register new member
                              </span>
                            </div>
                          </div>

                          {ptSuggestions.map((p) => (
                            <div
                              key={p.id}
                              className={styles.suggestionItem}
                              onClick={() => handleSelectPatient(p)}
                            >
                              <div className={styles.sugMain}>
                                <strong>{p.name}</strong>
                                <span className={styles.sugCat}>
                                  {p.contact}
                                </span>
                              </div>
                              <div className={styles.sugSub}>
                                {p.age} yrs • {p.gender}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {isLoadingPts && (
                        <div className={styles.sugLoading}>
                          Searching patients...
                        </div>
                      )}
                    </div>
                  )}

                  {ptSnapshot && (
                    <div className={styles.aiSnapshotBox} data-tour="ai-snapshot">
                      <div className={styles.snapshotHeader}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                          >
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                          </svg>
                          Clinical Profile Snapshot
                          {ptSnapshot.totalVisits > 0 && (
                            <span className={styles.snapshotBadge}>{ptSnapshot.totalVisits} visit{ptSnapshot.totalVisits > 1 ? "s" : ""}</span>
                          )}
                        </div>
                        {selectedPatientId && (
                          <Link
                            href={`/demo/portal/doctor-dashboard/patients/${selectedPatientId}`}
                            target="_blank"
                            className={styles.viewProfileBtn}
                          >
                            See Patient Profile →
                          </Link>
                        )}
                      </div>
                      <div className={styles.snapshotGrid}>
                        <div className={styles.snapshotRow}>
                          <span className={styles.snapshotLabel}>🩺 Conditions</span>
                          <span className={styles.snapshotValue}>
                            {ptSnapshot.keyConditions?.map((c: string, i: number) => (
                              <span key={i} className={styles.conditionTag}>{c}</span>
                            ))}
                          </span>
                        </div>
                        {ptSnapshot.chronicFlags?.length > 0 && (
                          <div className={styles.snapshotRow}>
                            <span className={styles.snapshotLabel}>⚠️ Chronic</span>
                            <span className={styles.snapshotValue}>
                              {ptSnapshot.chronicFlags.map((f: string, i: number) => (
                                <span key={i} className={styles.chronicTag}>{f}</span>
                              ))}
                            </span>
                          </div>
                        )}
                        <div className={styles.snapshotRow}>
                          <span className={styles.snapshotLabel}>💊 Medications</span>
                          <span className={styles.snapshotValue}>
                            {ptSnapshot.currentMedications?.map((m: string, i: number) => (
                              <span key={i} className={styles.medTag}>{m}</span>
                            ))}
                          </span>
                        </div>
                        {ptSnapshot.allergies?.length > 0 && (
                          <div className={styles.snapshotRow}>
                            <span className={styles.snapshotLabel}>🚫 Allergies</span>
                            <span className={styles.snapshotValue}>
                              {ptSnapshot.allergies.map((a: string, i: number) => (
                                <span key={i} className={styles.allergyTag}>{a}</span>
                              ))}
                            </span>
                          </div>
                        )}
                        {ptSnapshot.recentVisitsSummary && (
                          <div className={styles.snapshotSummary}>
                            {ptSnapshot.recentVisitsSummary}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Only show manual name field when NOT from queue */}
                  {!searchParams.get("patientId") && (
                    <div className="field">
                      <label>Patient Full Name</label>
                      <input
                        type="text"
                        value={ptName}
                        onFocus={() => setPtSuggestions([])}
                        onChange={(e) =>
                          setPtName(e.target.value.toUpperCase())
                        }
                        placeholder="ENTER PATIENT NAME"
                      />
                    </div>
                  )}

                  <div style={{ display: "flex", gap: "16px" }}>
                    <div className="field" style={{ flex: 1 }}>
                      <label>Date</label>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                      />
                    </div>
                    <div className="field" style={{ flex: 1 }}>
                      <label>Age (Yrs)</label>
                      <input
                        type="text"
                        value={ptAge}
                        onChange={(e) => setPtAge(e.target.value)}
                        placeholder="Age"
                      />
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "16px" }}>
                    <div className="field" style={{ flex: 1 }}>
                      <label>Sex</label>
                      <select
                        value={ptSex}
                        onChange={(e) => setPtSex(e.target.value)}
                      >
                        <option>Male</option>
                        <option>Female</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div className="field" style={{ flex: 1 }}>
                      <label>Blood Group</label>
                      <input
                        type="text"
                        value={ptBloodGroup}
                        onChange={(e) =>
                          setPtBloodGroup(e.target.value.toUpperCase())
                        }
                        placeholder="e.g. O+, B-"
                      />
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "16px" }}>
                    <div className="field" style={{ flex: 1 }}>
                      <label>Weight (Kg)</label>
                      <input
                        type="text"
                        value={ptWeight}
                        onChange={(e) => setPtWeight(e.target.value)}
                        placeholder="Weight"
                      />
                    </div>
                    <div className="field" style={{ flex: 1 }}></div>
                  </div>
                </div>
                <div className={styles.panelBlock} data-tour="clinical-notes">
                  <h3 className={styles.blockTitle}>Clinical Notes</h3>
                  <div className="field">
                    <label>Chief Complaints (CC)</label>
                    <div className={styles.quickTags}>
                      {commonCC.map((t) => (
                        <button
                          key={t}
                          className={styles.tag}
                          onClick={() => quickAdd(setCc, t)}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                    <textarea
                      rows={2}
                      value={cc}
                      onChange={(e) => setCc(e.target.value)}
                      placeholder="Symptoms..."
                    />
                  </div>
                  <div className="field">
                    <label>Findings (O/E)</label>
                    <textarea
                      rows={2}
                      value={findings}
                      onChange={(e) => setFindings(e.target.value)}
                      placeholder="Clinical observations..."
                    />
                  </div>
                  <div className="field">
                    <label>Diagnosis</label>
                    <textarea
                      rows={2}
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                      placeholder="Official diagnosis..."
                    />
                  </div>
                </div>
                <button
                  className="btn-primary"
                  onClick={() => setActiveTab("rx")}
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  Next: Medicines →
                </button>
              </div>
            )}

            {activeTab === "rx" && (
              <div className={styles.tabContent}>
                {ptSnapshot && (
                  <div
                    className={styles.aiSnapshotBox}
                    style={{ marginBottom: 20 }}
                  >
                    <div className={styles.snapshotHeader}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                        >
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                        </svg>
                        Clinical Profile Snapshot
                        {ptSnapshot.totalVisits > 0 && (
                          <span className={styles.snapshotBadge}>{ptSnapshot.totalVisits} visit{ptSnapshot.totalVisits > 1 ? "s" : ""}</span>
                        )}
                      </div>
                      {selectedPatientId && (
                        <Link
                          href={`/demo/portal/doctor-dashboard/patients/${selectedPatientId}`}
                          target="_blank"
                          className={styles.viewProfileBtn}
                        >
                          See Patient Profile →
                        </Link>
                      )}
                    </div>
                    <div className={styles.snapshotGrid}>
                      <div className={styles.snapshotRow}>
                        <span className={styles.snapshotLabel}>🩺 Conditions</span>
                        <span className={styles.snapshotValue}>
                          {ptSnapshot.keyConditions?.map((c: string, i: number) => (
                            <span key={i} className={styles.conditionTag}>{c}</span>
                          ))}
                        </span>
                      </div>
                      {ptSnapshot.chronicFlags?.length > 0 && (
                        <div className={styles.snapshotRow}>
                          <span className={styles.snapshotLabel}>⚠️ Chronic</span>
                          <span className={styles.snapshotValue}>
                            {ptSnapshot.chronicFlags.map((f: string, i: number) => (
                              <span key={i} className={styles.chronicTag}>{f}</span>
                            ))}
                          </span>
                        </div>
                      )}
                      <div className={styles.snapshotRow}>
                        <span className={styles.snapshotLabel}>💊 Medications</span>
                        <span className={styles.snapshotValue}>
                          {ptSnapshot.currentMedications?.map((m: string, i: number) => (
                            <span key={i} className={styles.medTag}>{m}</span>
                          ))}
                        </span>
                      </div>
                      {ptSnapshot.allergies?.length > 0 && (
                        <div className={styles.snapshotRow}>
                          <span className={styles.snapshotLabel}>🚫 Allergies</span>
                          <span className={styles.snapshotValue}>
                            {ptSnapshot.allergies.map((a: string, i: number) => (
                              <span key={i} className={styles.allergyTag}>{a}</span>
                            ))}
                          </span>
                        </div>
                      )}
                      {ptSnapshot.recentVisitsSummary && (
                        <div className={styles.snapshotSummary}>
                          {ptSnapshot.recentVisitsSummary}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className={styles.panelBlock} data-tour="prescribe-medicine">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "12px",
                    }}
                  >
                    <h3
                      className={styles.blockTitle}
                      style={{ margin: 0, border: "none" }}
                    >
                      Prescribe Medicine
                    </h3>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "16px",
                      marginBottom: "16px",
                    }}
                  >
                    <div
                      className="field"
                      style={{ width: "120px", marginBottom: 0 }}
                    >
                      <select
                        value={mType}
                        onChange={(e) => setMType(e.target.value)}
                      >
                        <option>Tab</option>
                        <option>Cap</option>
                        <option>Syp</option>
                        <option>Inj</option>
                        <option>Drop</option>
                        <option>Oint</option>
                      </select>
                    </div>
                    <div
                      className="field"
                      style={{ flex: 1, position: "relative", marginBottom: 0 }}
                    >
                      <input
                        type="text"
                        value={mName}
                        onChange={(e) => {
                          skipSearchRef.current = false;
                          setMName(e.target.value.toUpperCase());
                        }}
                        placeholder="MEDICINE NAME OR SYMPTOM..."
                        autoComplete="off"
                      />
                      {dbSuggestions.length > 0 && (
                        <div className={styles.suggestionsDropdown}>
                          {dbSuggestions.map((med) => (
                            <div
                              key={med.id}
                              className={styles.suggestionItem}
                              onClick={() => handleSelectMedicine(med)}
                            >
                              <div className={styles.sugMain}>
                                <strong>{med.name}</strong>
                                <span className={styles.sugCat}>
                                  {med.category}
                                </span>
                              </div>
                              <div className={styles.sugSub}>
                                {med.strength} •{" "}
                                <small>{med.tags.join(", ")}</small>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {isLoadingSuggestions && (
                        <div className={styles.sugLoading}>Searching...</div>
                      )}
                    </div>
                    <div
                      className="field"
                      style={{ width: "150px", marginBottom: 0 }}
                    >
                      <input
                        type="text"
                        value={mDose}
                        onChange={(e) => setMDose(e.target.value)}
                        placeholder="Dose (e.g. 650mg)"
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "16px",
                      marginBottom: "16px",
                    }}
                  >
                    <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                      <select
                        value={mFreq}
                        onChange={(e) => setMFreq(e.target.value)}
                      >
                        <option value="" disabled>
                          Frequency
                        </option>
                        <option value="None">Not Required</option>
                        <option>1-0-0</option>
                        <option>0-0-1</option>
                        <option>1-0-1</option>
                        <option>1-1-1</option>
                        <option>SOS</option>
                      </select>
                    </div>

                    <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                      {showCustomDur ? (
                        <input
                          type="text"
                          placeholder="Custom Days..."
                          value={mDur}
                          onChange={(e) => setMDur(e.target.value)}
                          autoFocus
                          onBlur={() => {
                            if (!mDur) setShowCustomDur(false);
                          }}
                        />
                      ) : (
                        <select
                          value={mDur}
                          onChange={(e) => {
                            if (e.target.value === "Custom") {
                              setShowCustomDur(true);
                              setMDur("");
                            } else {
                              setMDur(e.target.value);
                            }
                          }}
                        >
                          <option value="" disabled>
                            Duration
                          </option>
                          <option value="None">Not Required</option>
                          <option>1 Day</option>
                          <option>3 Days</option>
                          <option>5 Days</option>
                          <option>7 Days</option>
                          <option>15 Days</option>
                          <option>1 Month</option>
                          <option value="Custom">Custom</option>
                        </select>
                      )}
                    </div>

                    <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                      <select
                        value={mInst}
                        onChange={(e) => setMInst(e.target.value)}
                      >
                        <option value="" disabled>
                          Timing
                        </option>
                        <option value="None">Not Required</option>
                        <option>After Meal</option>
                        <option>Before Meal</option>
                        <option>Empty Stomach</option>
                      </select>
                    </div>
                  </div>

                  <div className="field" style={{ marginBottom: "16px" }}>
                    <input
                      type="text"
                      value={mNote}
                      onChange={(e) => setMNote(e.target.value)}
                      placeholder="Special Instructions (e.g. Take with warm water)"
                    />
                  </div>
                  <button
                    className="btn-secondary"
                    style={{
                      width: "100%",
                      marginBottom: "24px",
                      display: "flex",
                      justifyContent: "center",
                      fontWeight: "bold",
                    }}
                    onClick={addMed}
                  >
                    + Add to Rx
                  </button>
                  {meds.length > 0 && (
                    <div className={styles.medsList}>
                      {meds.map((m) => (
                        <div key={m.id} className={styles.medItem}>
                          <div className={styles.mLeft}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                              <span className={styles.mTypeBadge}>{m.type}</span>
                              <strong style={{ fontSize: "15px", color: "#1e293b", fontWeight: 700 }}>{m.name}</strong>
                              {m.dose && <span style={{ color: "#64748b", fontSize: "13px", fontWeight: 600 }}>({m.dose})</span>}
                            </div>
                            <div className={styles.mDetails}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: "var(--teal)", flexShrink: 0 }}>
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                              </svg>
                              <span>{m.freq || "As directed"}</span>
                              {m.duration && (
                                <>
                                  <span style={{ color: "#cbd5e1" }}>•</span>
                                  <span>{m.duration}</span>
                                </>
                              )}
                              {m.instructions && (
                                <>
                                  <span style={{ color: "#cbd5e1" }}>•</span>
                                  <span>{m.instructions}</span>
                                </>
                              )}
                            </div>
                            {m.note && (
                              <div className={styles.mNote}>
                                Note: {m.note}
                              </div>
                            )}
                          </div>
                          <button
                            className={styles.btnRemove}
                            onClick={() => removeMed(m.id)}
                            title="Remove from Prescription"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <line x1="18" y1="6" x2="6" y2="18"></line>
                              <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {guidanceApproved ? (
                  <div className={styles.exportRow} data-tour="export-actions">
                    <button
                      className={styles.btnEx}
                      onClick={handleSave}
                      title="Save to Database"
                      disabled={isSaving}
                      style={{ opacity: isSaving ? 0.5 : 1 }}
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" width="20">
                        <path d="M17,3H5C3.89,3 3,3.9 3,5V19C3,20.1 3.89,21 5,21H19C20.1,21 21,20.1 21,19V7L17,3M12,19A3,3 0 0,1 9,16A3,3 0 0,1 12,13A3,3 0 0,1 15,16A3,3 0 0,1 12,19M15,9H5V5H15V9Z" />
                      </svg>
                    </button>
                    <button
                      className={styles.btnEx}
                      onClick={downloadPDF}
                      title="Download PDF"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" width="20">
                        <path d="M14,2L20,8V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V4A2,2 0 0,1 6,2H14M18,20V9H13V4H6V20H18M10,18V12H12V18H10M13,18V12H15V18H13M16,18V12H18V18H16Z" />
                      </svg>
                    </button>
                    <button
                      className={styles.btnEx}
                      onClick={downloadImage}
                      title="Save Image"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" width="20">
                        <path d="M8.5,13.5L11,16.5L14.5,12L19,18H5L8.5,13.5M21,19V5C21,3.89 20.1,3 19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19M5,5H19V19H5V5Z" />
                      </svg>
                    </button>
                    <button
                      className={styles.btnEx}
                      onClick={shareWhatsApp}
                      title="WhatsApp Share"
                      style={{ background: "#25d366" }}
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" width="20">
                        <path d="M12.04,2C6.58,2,2.13,6.45,2.13,11.91c0,1.75,0.45,3.45,1.32,4.95L2,22l5.25-1.38c1.45,0.79,3.08,1.21,4.74,1.21c5.44,0,9.89-4.45,9.89-9.91C21.89,6.45,17.5,2,12.04,2z M16.59,16.27c-0.27,0.76-1.58,1.39-2.16,1.47c-0.58,0.08-1.13,0.01-1.78-0.2c-0.43-0.14-1.01-0.34-1.74-0.66c-3.1-1.36-5.11-4.52-5.26-4.73c-0.15-0.21-1.25-1.63-1.25-3.11c0-1.48,0.73-2.21,1-2.52c0.27-0.3,0.6-0.38,0.79-0.38c0.19,0,0.38,0,0.54,0.01c0.17,0.01,0.39-0.06,0.61,0.46c0.23,0.54,0.79,1.91,0.85,2.04c0.06,0.13,0.11,0.28,0.02,0.46c-0.08,0.18-0.13,0.29-0.26,0.44c-0.13,0.15-0.27,0.34-0.39,0.46c-0.13,0.13-0.28,0.28-0.12,0.54c0.16,0.27,0.7,1.15,1.49,1.85c1.02,0.91,1.88,1.2,2.16,1.32c0.28,0.11,0.44,0.1,0.61-0.09c0.17-0.19,0.73-0.85,0.93-1.14c0.2-0.29,0.39-0.24,0.66-0.15c0.27,0.09,1.7,0.8,2,0.94c0.3,0.14,0.5,0.22,0.57,0.34C17.09,14.88,16.86,15.51,16.59,16.27z" />
                      </svg>
                    </button>
                    <button
                      className={styles.btnEx}
                      onClick={() => window.print()}
                      title="Print"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" width="20">
                        <path d="M18,3H6V7H18M19,12A1,1 0 0,1 18,11A1,1 0 0,1 19,10A1,1 0 0,1 20,11A1,1 0 0,1 19,12M16,19H8V14H16M19,8H5A3,3 0 0,0 2,11V17H6V21H18V17H22V11A3,3 0 0,0 19,8Z" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className={styles.exportRow}>
                    <button
                      className={styles.adviceRecommendBtn}
                      data-tour="advice-recommend-btn"
                      onClick={() => setIsReviewModalOpen(true)}
                      type="button"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 8 }}>
                        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                        <path d="M12 6v6l4 2" />
                      </svg>
                      <span>Advice & Recommendation</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Preview Side - Enhanced Professional Template */}
          <div className={styles.previewPanel}>
            <div className={styles.rxCard} ref={rxPaperRef} id="rx-preview" data-tour="rx-preview">
              {/* 1. Header with Qualifications */}
              <div className={styles.rxHeader}>
                <div className={styles.headerColumn}>
                  <div className={styles.drName}>
                    Dr. {selectedDoctorObj?.name || "Consultant Name"}
                  </div>
                  <div className={styles.drQual}>
                    {selectedDoctorObj?.qualification || "M.B.B.S., M.D."}
                  </div>
                  <div className={styles.drSmall}>
                    {selectedDoctorObj?.specialty || "General Consultant"}
                  </div>
                </div>
                <div className={styles.headerLogo}>
                  <div className={styles.logoCircle}>
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                    </svg>
                  </div>
                </div>
                <div
                  className={styles.headerColumn}
                  style={{ textAlign: "right" }}
                >
                  <div className={styles.hospName}>
                    {clinic?.name || "HOSPITAL NAME"}
                  </div>
                  <div className={styles.hospSlogan}>
                    {clinic?.tagline || "Advanced Healthcare Solutions"}
                  </div>
                  <div
                    className={styles.drSmall}
                    style={{
                      marginTop: 8,
                      fontSize: "14px",
                      fontWeight: "800",
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      width="22"
                      style={{
                        verticalAlign: "middle",
                        marginRight: 6,
                        color: "#0d6e56",
                      }}
                    >
                      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                    </svg>
                    {clinic?.phone || "000-111-2222"}
                  </div>
                </div>
              </div>

              {/* 2. Condensed Patient Info Bar */}
              <div className={styles.rxInfoBar}>
                <div className={styles.infoGroup}>
                  <b>NAME:</b> {ptName || "________________"}
                </div>
                <div className={styles.infoGroup}>
                  <b>AGE/SEX:</b> {ptAge || "___"} / {ptSex[0]}
                </div>
                <div className={styles.infoGroup}>
                  <b>B.GRP:</b> {ptBloodGroup || "____"}
                </div>
                <div className={styles.infoGroup}>
                  <b>WT:</b> {ptWeight ? `${ptWeight}Kg` : "____"}
                </div>
                <div className={styles.infoGroup}>
                  <b>DATE:</b> {new Date(date).toLocaleDateString("en-IN")}
                </div>
              </div>

              {/* 3. Main Body */}
              <div className={styles.rxMainBody}>
                <div className={styles.rxWatermark}>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                  </svg>
                </div>

                <div className={styles.bodySplit}>
                  <div className={styles.bodyLeftColumn}>
                    <div className={styles.vitalsSection}>
                      {cc && (
                        <div className={styles.notesBlock}>
                          <b>C/C (Chief Complaints):</b>
                          <br />
                          {cc}
                        </div>
                      )}
                      {findings && (
                        <div className={styles.notesBlock}>
                          <b>Findings (O/E):</b>
                          <br />
                          {findings}
                        </div>
                      )}
                      {diagnosis && (
                        <div
                          className={styles.notesBlock}
                          style={{
                            background: "#f8fafc",
                            borderLeft: "3px solid #0d6e56",
                            padding: "12px",
                            borderRadius: "0 8px 8px 0",
                            marginTop: "12px",
                          }}
                        >
                          <b style={{ color: "#0d6e56" }}>DIAGNOSIS:</b>
                          <br />
                          <span style={{ fontWeight: 800 }}>{diagnosis}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className={styles.bodyRightColumn}>
                    <div className={styles.rxBigLogo}>Rx</div>
                    <div className={styles.medsContent}>
                      {meds.map((m) => (
                        <div key={m.id} className={styles.previewMedItem}>
                          <div className={styles.pmHeadline}>
                            <b>
                              {m.type}. {m.name}
                            </b>{" "}
                            {m.dose}
                          </div>
                          <div className={styles.pmDetails}>
                            {m.freq} ━━ {m.duration} ━━ {m.instructions}
                          </div>
                          {m.note && (
                            <div className={styles.pmNote}>* {m.note}</div>
                          )}
                        </div>
                      ))}
                      {meds.length === 0 && (
                        <div className={styles.emptyRx}>
                          Prescribe medicines...
                        </div>
                      )}
                    </div>
                    {advice && (
                      <div
                        className={styles.previewAdvice}
                        style={{ whiteSpace: "pre-line" }}
                      >
                        <b>Advice:</b>
                        <br />
                        {advice}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 4. Revamped Follow-up & Address Section */}
              <div className={styles.rxFooterSection}>
                {followUp && (
                  <div className={styles.revisitBox}>
                    <div className={styles.revisitLabel}>
                      REVISIT / FOLLOW-UP
                    </div>
                    <div className={styles.revisitDate}>
                      {new Date(followUp).toLocaleDateString("en-IN", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                )}

                <div className={styles.addressLine}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    width="28"
                    style={{ color: "#0d6e56" }}
                  >
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                  </svg>
                  <div className={styles.addressText}>
                    {clinic?.address || "Clinic Address, City Location"}
                  </div>
                </div>
              </div>

              {/* 5. Clean Baseline Footer */}
              <div className={styles.rxFooterAesthetic}>
                <div className={styles.geoRight}></div>
                <div className={styles.bottomBar}>
                  <div className={styles.footerLegal}>
                    Digital Clinical Document •{" "}
                    {clinic?.name || "Authorized Medical Facility"} • Certified
                    EHR
                  </div>
                </div>
              </div>
            </div>

            {/* Page 2: Patient Guidance Sheet (if generated) */}
            {guidanceSheet && (
              <div 
                className={styles.guidanceCard} 
                ref={guidancePaperRef} 
                id="guidance-preview"
                data-tour="guidance-preview"
                style={{ position: 'relative' }}
              >
                {/* Overlay for pending review */}
                {!guidanceApproved && (
                  <div className={styles.guidanceOverlay}>
                    <div className={styles.overlayTitle}>Patient Guidance Sheet Ready</div>
                    <div className={styles.overlayText}>
                      An AI-generated lifestyle, diet, and care guidance sheet is ready based on your diagnosis and medicines.
                    </div>
                    <button 
                      className={styles.overlayBtn}
                      onClick={() => setIsReviewModalOpen(true)}
                    >
                      Review & Approve Guidance Sheet
                    </button>
                  </div>
                )}

                {/* 1. Header (matching rxCard header) */}
                <div className={styles.guidanceHeader}>
                  <div className={styles.headerColumn}>
                    <div className={styles.drName}>
                      Dr. {selectedDoctorObj?.name || "Consultant Name"}
                    </div>
                    <div className={styles.drQual}>
                      {selectedDoctorObj?.qualification || "M.B.B.S., M.D."}
                    </div>
                    <div className={styles.drSmall}>
                      {selectedDoctorObj?.specialty || "General Consultant"}
                    </div>
                  </div>
                  <div className={styles.headerLogo}>
                    <div className={styles.logoCircle}>
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                      </svg>
                    </div>
                  </div>
                  <div className={styles.headerColumn} style={{ textAlign: "right" }}>
                    <div className={styles.hospName}>
                      {clinic?.name || "HOSPITAL NAME"}
                    </div>
                    <div className={styles.hospSlogan}>
                      {clinic?.tagline || "Advanced Healthcare Solutions"}
                    </div>
                  </div>
                </div>

                <div className={styles.guidanceTitleArea}>
                  <div className={styles.guidanceBadge}>Patient Guidance Sheet</div>
                  <div className={styles.guidanceSubtitle}>Custom Care Plan & Advice</div>
                </div>

                {/* 2-column Grid Layout for Sections */}
                <div className={styles.guidanceGrid}>
                  {/* Section 1: Understanding Condition */}
                  {guidanceStatus.understanding_condition !== 'rejected' && (
                    <div className={styles.guidanceSection}>
                      <div className={styles.guidanceSectionHeader}>
                        <div className={styles.guidanceSectionIcon}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                          </svg>
                        </div>
                        <span className={styles.guidanceSectionTitle}>Understanding Condition</span>
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}>
                        {guidanceSheet.understanding_condition?.disease_name || diagnosis || "Condition"}
                      </div>
                      <ul className={styles.guidancePointsList}>
                        {(guidanceStatus.understanding_condition === 'accepted' 
                          ? (guidanceEditedTexts.understanding_condition ? guidanceEditedTexts.understanding_condition.split("\n").filter(Boolean).filter((l: string) => !l.toLowerCase().includes("diagnosis:")) : [])
                          : (guidanceSheet.understanding_condition?.points || [])
                        ).map((pt: string, idx: number) => (
                          <li key={idx} className={styles.guidancePointItem}>{pt}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Section 2: Diet & Nutrition */}
                  {guidanceStatus.diet_nutrition !== 'rejected' && (
                    <div className={styles.guidanceSection}>
                      <div className={styles.guidanceSectionHeader}>
                        <div className={styles.guidanceSectionIcon}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                            <path d="M12 2A10 10 0 0 0 2 12a9.9 9.9 0 0 0 .5 3.2l-1.5 5.3a1 1 0 0 0 1.2 1.2l5.3-1.5a10 10 0 1 0 4.5-20.2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" />
                          </svg>
                        </div>
                        <span className={styles.guidanceSectionTitle}>Diet & Nutrition</span>
                      </div>
                      <ul className={styles.guidancePointsList}>
                        {(guidanceStatus.diet_nutrition === 'accepted'
                          ? (guidanceEditedTexts.diet_nutrition ? guidanceEditedTexts.diet_nutrition.split("\n").filter(Boolean) : [])
                          : (guidanceSheet.diet_nutrition?.points || [])
                        ).map((pt: string, idx: number) => (
                          <li key={idx} className={styles.guidancePointItem}>{pt}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Section 3: Hydration */}
                  {guidanceStatus.hydration !== 'rejected' && (
                    <div className={styles.guidanceSection}>
                      <div className={styles.guidanceSectionHeader}>
                        <div className={styles.guidanceSectionIcon}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                            <path d="M12 22a7 7 0 0 0 7-7c0-4.3-7-13-7-13S5 10.7 5 15a7 7 0 0 0 7 7z" />
                          </svg>
                        </div>
                        <span className={styles.guidanceSectionTitle}>Water & Hydration</span>
                      </div>
                      <ul className={styles.guidancePointsList}>
                        {(guidanceStatus.hydration === 'accepted'
                          ? (guidanceEditedTexts.hydration ? guidanceEditedTexts.hydration.split("\n").filter(Boolean).filter((l: string) => !l.toLowerCase().includes("tip:")) : [])
                          : (guidanceSheet.hydration?.points || [])
                        ).map((pt: string, idx: number) => (
                          <li key={idx} className={styles.guidancePointItem}>{pt}</li>
                        ))}
                      </ul>
                      {guidanceSheet.hydration?.tip && (
                        <div className={styles.guidanceCallout}>
                          <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h-3V9h5v8z" />
                          </svg>
                          <span>{guidanceSheet.hydration.tip}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Section 4: Activity & Exercise */}
                  {guidanceStatus.activity_exercise !== 'rejected' && (
                    <div className={styles.guidanceSection}>
                      <div className={styles.guidanceSectionHeader}>
                        <div className={styles.guidanceSectionIcon}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                            <path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h1a4 4 0 0 0 0 8H2M6 12h12M6 8v8M18 8v8" />
                          </svg>
                        </div>
                        <span className={styles.guidanceSectionTitle}>Activity & Exercise</span>
                      </div>
                      <ul className={styles.guidancePointsList}>
                        {(guidanceStatus.activity_exercise === 'accepted'
                          ? (guidanceEditedTexts.activity_exercise ? guidanceEditedTexts.activity_exercise.split("\n").filter(Boolean).filter((l: string) => !l.toLowerCase().includes("tip:")) : [])
                          : (guidanceSheet.activity_exercise?.points || [])
                        ).map((pt: string, idx: number) => (
                          <li key={idx} className={styles.guidancePointItem}>{pt}</li>
                        ))}
                      </ul>
                      {guidanceSheet.activity_exercise?.tip && (
                        <div className={styles.guidanceCallout}>
                          <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h-3V9h5v8z" />
                          </svg>
                          <span>{guidanceSheet.activity_exercise.tip}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Section 5: Things To Avoid */}
                  {guidanceStatus.things_to_avoid !== 'rejected' && (
                    <div className={styles.guidanceSection}>
                      <div className={styles.guidanceSectionHeader}>
                        <div className={styles.guidanceSectionIcon}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                          </svg>
                        </div>
                        <span className={styles.guidanceSectionTitle}>Things To Avoid</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {(guidanceStatus.things_to_avoid === 'accepted'
                          ? (guidanceEditedTexts.things_to_avoid
                              ? guidanceEditedTexts.things_to_avoid.split("\n").filter(Boolean).map((line: string) => {
                                  const parts = line.split(":");
                                  return {
                                    text: parts[0]?.replace(/^-\s*/, '')?.trim() || "",
                                    reason: parts.slice(1).join(":")?.trim() || ""
                                  };
                                })
                              : [])
                          : (guidanceSheet.things_to_avoid?.items || [])
                        ).map((item: any, idx: number) => (
                          <div key={idx} className={styles.guidanceAvoidItem}>
                            <div className={styles.guidanceAvoidTitle}>
                              <span style={{ color: '#ef4444' }}>❌</span>
                              <span>{item.text}</span>
                            </div>
                            {item.reason && <div className={styles.guidanceAvoidReason}>{item.reason}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Section 6: Warning Signs */}
                  {guidanceStatus.warning_signs !== 'rejected' && (
                    <div className={styles.guidanceSection}>
                      <div className={styles.guidanceSectionHeader}>
                        <div className={styles.guidanceSectionIcon}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                            <line x1="12" y1="9" x2="12" y2="13" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                          </svg>
                        </div>
                        <span className={styles.guidanceSectionTitle}>Warning Signs</span>
                      </div>
                      <ul className={styles.guidancePointsList} style={{ marginBottom: '12px' }}>
                        {(guidanceStatus.warning_signs === 'accepted'
                          ? (guidanceEditedTexts.warning_signs ? guidanceEditedTexts.warning_signs.split("\n").filter(Boolean).filter((l: string) => !l.toLowerCase().includes("follow-up:") && !l.toLowerCase().includes("red flags:")) : [])
                          : (guidanceSheet.warning_signs?.red_flags || [])
                        ).map((pt: string, idx: number) => (
                          <li key={idx} className={styles.guidanceRedFlagItem}>{pt}</li>
                        ))}
                      </ul>
                      {(guidanceStatus.warning_signs === 'accepted'
                        ? (guidanceEditedTexts.warning_signs?.split("\n").find((l: string) => l.toLowerCase().includes("follow-up:"))?.replace(/^follow-up:\s*/i, '') || guidanceSheet.warning_signs?.follow_up)
                        : (guidanceSheet.warning_signs?.follow_up)
                      ) && (
                        <div className={styles.guidanceCallout} style={{ background: '#fff5f5', borderColor: '#ef4444', color: '#b91c1c' }}>
                          <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h-3V9h5v8z" />
                          </svg>
                          <span>
                            {guidanceStatus.warning_signs === 'accepted'
                              ? (guidanceEditedTexts.warning_signs?.split("\n").find((l: string) => l.toLowerCase().includes("follow-up:"))?.replace(/^follow-up:\s*/i, '') || guidanceSheet.warning_signs?.follow_up)
                              : (guidanceSheet.warning_signs?.follow_up)
                            }
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 3. General Care Tips Footer */}
                {guidanceSheet.general_tips && guidanceSheet.general_tips.length > 0 && (
                  <div className={styles.guidanceFooter}>
                    <div className={styles.guidanceFooterTips}>
                      {(guidanceSheet.general_tips || []).slice(0, 3).map((tip: string, idx: number) => (
                        <div key={idx} className={styles.guidanceFooterTip}>
                          <span>🛡️</span>
                          <span>{tip}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {modalConfig?.isOpen && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.customModal} ${styles[modalConfig.type]}`}>
            <div className={styles.modalHeader}>
              <div className={styles.modalIcon}>
                {modalConfig.type === "success" && (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                {modalConfig.type === "warning" && (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                )}
                {modalConfig.type === "error" && (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                )}
                {modalConfig.type === "info" && (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                )}
              </div>
              <h3>{modalConfig.title}</h3>
            </div>
            <div className={styles.modalBody}>
              <p>{modalConfig.message}</p>
            </div>
            <div className={styles.modalFooter}>
              <button
                className={styles.modalCloseBtn}
                onClick={() => setModalConfig(null)}
              >
                Okay
              </button>
            </div>
          </div>
        </div>
      )}

      {isReviewModalOpen && guidanceSheet && (
        <div className={styles.reviewModalOverlay}>
          <div className={styles.reviewModal}>
            <div className={styles.reviewHeader}>
              <div>
                <div className={styles.reviewHeaderTitle}>Review Patient Guidance Sheet</div>
                <div className={styles.reviewHeaderSubtitle}>Accept, edit, or reject each section before finalizing the prescription.</div>
              </div>
              <button className={styles.reviewCloseBtn} onClick={() => setIsReviewModalOpen(false)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className={styles.reviewBody}>
              {/* Card 1: Understanding Condition */}
              <div className={`${styles.reviewSectionCard} ${styles[guidanceStatus.understanding_condition]}`}>
                <div className={styles.reviewSectionTop}>
                  <span className={styles.reviewSectionTitle}>1. Understanding Condition</span>
                  <span className={`${styles.reviewSectionBadge} ${styles[guidanceStatus.understanding_condition]}`}>
                    {guidanceStatus.understanding_condition}
                  </span>
                </div>
                <div className={styles.reviewSectionContent}>
                  {guidanceStatus.understanding_condition === 'editing' ? (
                    <textarea 
                      value={guidanceEditedTexts.understanding_condition}
                      onChange={(e) => setGuidanceEditedTexts({
                        ...guidanceEditedTexts,
                        understanding_condition: e.target.value
                      })}
                    />
                  ) : (
                    <div>
                      <strong>Condition:</strong> {guidanceSheet.understanding_condition?.disease_name || diagnosis || "Condition"}
                      <ul>
                        {(guidanceStatus.understanding_condition === 'accepted'
                          ? guidanceEditedTexts.understanding_condition?.split("\n").filter(Boolean).filter((l: string) => !l.toLowerCase().includes("diagnosis:"))
                          : guidanceSheet.understanding_condition?.points || []
                        ).map((p: string, i: number) => <li key={i}>{p}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
                <div className={styles.reviewSectionActions}>
                  {guidanceStatus.understanding_condition === 'editing' ? (
                    <button className={`${styles.actionBtn} ${styles.save}`} onClick={() => setGuidanceStatus({...guidanceStatus, understanding_condition: 'accepted'})}>Save</button>
                  ) : (
                    <>
                      <button className={`${styles.actionBtn} ${styles.accept}`} onClick={() => setGuidanceStatus({...guidanceStatus, understanding_condition: 'accepted'})}>Accept</button>
                      <button className={styles.actionBtn} onClick={() => setGuidanceStatus({...guidanceStatus, understanding_condition: 'editing'})}>Edit</button>
                      <button className={`${styles.actionBtn} ${styles.reject}`} onClick={() => setGuidanceStatus({...guidanceStatus, understanding_condition: 'rejected'})}>Reject</button>
                    </>
                  )}
                </div>
              </div>

              {/* Card 2: Diet & Nutrition */}
              <div className={`${styles.reviewSectionCard} ${styles[guidanceStatus.diet_nutrition]}`}>
                <div className={styles.reviewSectionTop}>
                  <span className={styles.reviewSectionTitle}>2. Diet & Nutrition</span>
                  <span className={`${styles.reviewSectionBadge} ${styles[guidanceStatus.diet_nutrition]}`}>
                    {guidanceStatus.diet_nutrition}
                  </span>
                </div>
                <div className={styles.reviewSectionContent}>
                  {guidanceStatus.diet_nutrition === 'editing' ? (
                    <textarea 
                      value={guidanceEditedTexts.diet_nutrition}
                      onChange={(e) => setGuidanceEditedTexts({
                        ...guidanceEditedTexts,
                        diet_nutrition: e.target.value
                      })}
                    />
                  ) : (
                    <ul>
                      {(guidanceStatus.diet_nutrition === 'accepted'
                        ? guidanceEditedTexts.diet_nutrition?.split("\n").filter(Boolean)
                        : guidanceSheet.diet_nutrition?.points || []
                      ).map((p: string, i: number) => <li key={i}>{p}</li>)}
                    </ul>
                  )}
                </div>
                <div className={styles.reviewSectionActions}>
                  {guidanceStatus.diet_nutrition === 'editing' ? (
                    <button className={`${styles.actionBtn} ${styles.save}`} onClick={() => setGuidanceStatus({...guidanceStatus, diet_nutrition: 'accepted'})}>Save</button>
                  ) : (
                    <>
                      <button className={`${styles.actionBtn} ${styles.accept}`} onClick={() => setGuidanceStatus({...guidanceStatus, diet_nutrition: 'accepted'})}>Accept</button>
                      <button className={styles.actionBtn} onClick={() => setGuidanceStatus({...guidanceStatus, diet_nutrition: 'editing'})}>Edit</button>
                      <button className={`${styles.actionBtn} ${styles.reject}`} onClick={() => setGuidanceStatus({...guidanceStatus, diet_nutrition: 'rejected'})}>Reject</button>
                    </>
                  )}
                </div>
              </div>

              {/* Card 3: Water & Hydration */}
              <div className={`${styles.reviewSectionCard} ${styles[guidanceStatus.hydration]}`}>
                <div className={styles.reviewSectionTop}>
                  <span className={styles.reviewSectionTitle}>3. Water & Hydration</span>
                  <span className={`${styles.reviewSectionBadge} ${styles[guidanceStatus.hydration]}`}>
                    {guidanceStatus.hydration}
                  </span>
                </div>
                <div className={styles.reviewSectionContent}>
                  {guidanceStatus.hydration === 'editing' ? (
                    <textarea 
                      value={guidanceEditedTexts.hydration}
                      onChange={(e) => setGuidanceEditedTexts({
                        ...guidanceEditedTexts,
                        hydration: e.target.value
                      })}
                    />
                  ) : (
                    <div>
                      <ul>
                        {(guidanceStatus.hydration === 'accepted'
                          ? guidanceEditedTexts.hydration?.split("\n").filter(Boolean).filter((l: string) => !l.toLowerCase().includes("tip:"))
                          : guidanceSheet.hydration?.points || []
                        ).map((p: string, i: number) => <li key={i}>{p}</li>)}
                      </ul>
                      {guidanceSheet.hydration?.tip && (
                        <div style={{ marginTop: 8, fontStyle: 'italic', color: '#0d6e56' }}>
                          Tip: {guidanceSheet.hydration.tip}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className={styles.reviewSectionActions}>
                  {guidanceStatus.hydration === 'editing' ? (
                    <button className={`${styles.actionBtn} ${styles.save}`} onClick={() => setGuidanceStatus({...guidanceStatus, hydration: 'accepted'})}>Save</button>
                  ) : (
                    <>
                      <button className={`${styles.actionBtn} ${styles.accept}`} onClick={() => setGuidanceStatus({...guidanceStatus, hydration: 'accepted'})}>Accept</button>
                      <button className={styles.actionBtn} onClick={() => setGuidanceStatus({...guidanceStatus, hydration: 'editing'})}>Edit</button>
                      <button className={`${styles.actionBtn} ${styles.reject}`} onClick={() => setGuidanceStatus({...guidanceStatus, hydration: 'rejected'})}>Reject</button>
                    </>
                  )}
                </div>
              </div>

              {/* Card 4: Activity & Exercise */}
              <div className={`${styles.reviewSectionCard} ${styles[guidanceStatus.activity_exercise]}`}>
                <div className={styles.reviewSectionTop}>
                  <span className={styles.reviewSectionTitle}>4. Activity & Exercise</span>
                  <span className={`${styles.reviewSectionBadge} ${styles[guidanceStatus.activity_exercise]}`}>
                    {guidanceStatus.activity_exercise}
                  </span>
                </div>
                <div className={styles.reviewSectionContent}>
                  {guidanceStatus.activity_exercise === 'editing' ? (
                    <textarea 
                      value={guidanceEditedTexts.activity_exercise}
                      onChange={(e) => setGuidanceEditedTexts({
                        ...guidanceEditedTexts,
                        activity_exercise: e.target.value
                      })}
                    />
                  ) : (
                    <div>
                      <ul>
                        {(guidanceStatus.activity_exercise === 'accepted'
                          ? guidanceEditedTexts.activity_exercise?.split("\n").filter(Boolean).filter((l: string) => !l.toLowerCase().includes("tip:"))
                          : guidanceSheet.activity_exercise?.points || []
                        ).map((p: string, i: number) => <li key={i}>{p}</li>)}
                      </ul>
                      {guidanceSheet.activity_exercise?.tip && (
                        <div style={{ marginTop: 8, fontStyle: 'italic', color: '#0d6e56' }}>
                          Tip: {guidanceSheet.activity_exercise.tip}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className={styles.reviewSectionActions}>
                  {guidanceStatus.activity_exercise === 'editing' ? (
                    <button className={`${styles.actionBtn} ${styles.save}`} onClick={() => setGuidanceStatus({...guidanceStatus, activity_exercise: 'accepted'})}>Save</button>
                  ) : (
                    <>
                      <button className={`${styles.actionBtn} ${styles.accept}`} onClick={() => setGuidanceStatus({...guidanceStatus, activity_exercise: 'accepted'})}>Accept</button>
                      <button className={styles.actionBtn} onClick={() => setGuidanceStatus({...guidanceStatus, activity_exercise: 'editing'})}>Edit</button>
                      <button className={`${styles.actionBtn} ${styles.reject}`} onClick={() => setGuidanceStatus({...guidanceStatus, activity_exercise: 'rejected'})}>Reject</button>
                    </>
                  )}
                </div>
              </div>

              {/* Card 5: Things To Avoid */}
              <div className={`${styles.reviewSectionCard} ${styles[guidanceStatus.things_to_avoid]}`}>
                <div className={styles.reviewSectionTop}>
                  <span className={styles.reviewSectionTitle}>5. Things To Avoid</span>
                  <span className={`${styles.reviewSectionBadge} ${styles[guidanceStatus.things_to_avoid]}`}>
                    {guidanceStatus.things_to_avoid}
                  </span>
                </div>
                <div className={styles.reviewSectionContent}>
                  {guidanceStatus.things_to_avoid === 'editing' ? (
                    <textarea 
                      value={guidanceEditedTexts.things_to_avoid}
                      onChange={(e) => setGuidanceEditedTexts({
                        ...guidanceEditedTexts,
                        things_to_avoid: e.target.value
                      })}
                    />
                  ) : (
                    <ul>
                      {(guidanceStatus.things_to_avoid === 'accepted'
                        ? guidanceEditedTexts.things_to_avoid?.split("\n").filter(Boolean)
                        : (guidanceSheet.things_to_avoid?.items || []).map((item: any) => `${item.text}: ${item.reason}`)
                      ).map((p: string, i: number) => <li key={i}>{p}</li>)}
                    </ul>
                  )}
                </div>
                <div className={styles.reviewSectionActions}>
                  {guidanceStatus.things_to_avoid === 'editing' ? (
                    <button className={`${styles.actionBtn} ${styles.save}`} onClick={() => setGuidanceStatus({...guidanceStatus, things_to_avoid: 'accepted'})}>Save</button>
                  ) : (
                    <>
                      <button className={`${styles.actionBtn} ${styles.accept}`} onClick={() => setGuidanceStatus({...guidanceStatus, things_to_avoid: 'accepted'})}>Accept</button>
                      <button className={styles.actionBtn} onClick={() => setGuidanceStatus({...guidanceStatus, things_to_avoid: 'editing'})}>Edit</button>
                      <button className={`${styles.actionBtn} ${styles.reject}`} onClick={() => setGuidanceStatus({...guidanceStatus, things_to_avoid: 'rejected'})}>Reject</button>
                    </>
                  )}
                </div>
              </div>

              {/* Card 6: Warning Signs */}
              <div className={`${styles.reviewSectionCard} ${styles[guidanceStatus.warning_signs]}`}>
                <div className={styles.reviewSectionTop}>
                  <span className={styles.reviewSectionTitle}>6. Warning Signs & Follow-up</span>
                  <span className={`${styles.reviewSectionBadge} ${styles[guidanceStatus.warning_signs]}`}>
                    {guidanceStatus.warning_signs}
                  </span>
                </div>
                <div className={styles.reviewSectionContent}>
                  {guidanceStatus.warning_signs === 'editing' ? (
                    <textarea 
                      value={guidanceEditedTexts.warning_signs}
                      onChange={(e) => setGuidanceEditedTexts({
                        ...guidanceEditedTexts,
                        warning_signs: e.target.value
                      })}
                    />
                  ) : (
                    <div>
                      <ul>
                        {(guidanceStatus.warning_signs === 'accepted'
                          ? guidanceEditedTexts.warning_signs?.split("\n").filter(Boolean).filter((l: string) => !l.toLowerCase().includes("follow-up:"))
                          : guidanceSheet.warning_signs?.red_flags || []
                        ).map((p: string, i: number) => <li key={i}>{p}</li>)}
                      </ul>
                      {guidanceSheet.warning_signs?.follow_up && (
                        <div style={{ marginTop: 8, fontStyle: 'italic', color: '#b91c1c' }}>
                          Follow-up: {guidanceSheet.warning_signs.follow_up}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className={styles.reviewSectionActions}>
                  {guidanceStatus.warning_signs === 'editing' ? (
                    <button className={`${styles.actionBtn} ${styles.save}`} onClick={() => setGuidanceStatus({...guidanceStatus, warning_signs: 'accepted'})}>Save</button>
                  ) : (
                    <>
                      <button className={`${styles.actionBtn} ${styles.accept}`} onClick={() => setGuidanceStatus({...guidanceStatus, warning_signs: 'accepted'})}>Accept</button>
                      <button className={styles.actionBtn} onClick={() => setGuidanceStatus({...guidanceStatus, warning_signs: 'editing'})}>Edit</button>
                      <button className={`${styles.actionBtn} ${styles.reject}`} onClick={() => setGuidanceStatus({...guidanceStatus, warning_signs: 'rejected'})}>Reject</button>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.reviewFooter}>
              <div className={styles.reviewProgressText}>
                {Object.values(guidanceStatus).filter(s => s === 'accepted').length} of 6 sections approved
              </div>
              <div className={styles.reviewFooterActions}>
                <button 
                  className={styles.footerBtn} 
                  onClick={() => {
                    const nextStatus = { ...guidanceStatus };
                    Object.keys(nextStatus).forEach(k => {
                      if (nextStatus[k] === 'pending') nextStatus[k] = 'accepted';
                    });
                    setGuidanceStatus(nextStatus);
                  }}
                >
                  Accept All
                </button>
                <button 
                  className={`${styles.footerBtn} ${styles.primary}`}
                  onClick={() => {
                    const approvedData = { ...guidanceSheet };
                    handleConfirmAndSaveGuidance(approvedData);
                  }}
                  disabled={Object.values(guidanceStatus).some(s => s === 'pending' || s === 'editing')}
                >
                  Confirm & Save Prescription
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <DemoPrescriptionTour
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        setCc={setCc}
        setFindings={setFindings}
        setDiagnosis={setDiagnosis}
        setMeds={setMeds}
        setAdvice={setAdvice}
        generateGuidance={generateGuidance}
        setIsGeneratingGuidance={setIsGeneratingGuidance}
        setGuidanceApproved={setGuidanceApproved}
      />
    </div>
  );
}
