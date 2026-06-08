"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import TopBar from "@/components/TopBar";
import { useClinic } from "@/context/ClinicContext";
import { createClient } from "@/lib/supabase/client";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { API_BASE_URL, authenticatedFetch } from "@/lib/api";
import styles from "./page.module.css";

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
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [pendingAiMeds, setPendingAiMeds] = useState<any[]>([]);
  const [aiValidationFlags, setAiValidationFlags] = useState<string[]>([]);
  const [aiDiagnosis, setAiDiagnosis] = useState("");
  const [aiDifferentials, setAiDifferentials] = useState<string[]>([]);
  const [primaryInvestigations, setPrimaryInvestigations] = useState<string[]>(
    [],
  );
  const [secondaryInvestigations, setSecondaryInvestigations] = useState<
    string[]
  >([]);
  const [aiConfidence, setAiConfidence] = useState(0);
  const [aiSeverity, setAiSeverity] = useState(""); // 'mild', 'moderate', 'emergency'
  const [aiIntent, setAiIntent] = useState("");
  const [aiStage, setAiStage] = useState("");
  const [aiStatus, setAiStatus] = useState(""); // 'analyzing', 'ready', 'error', or ''
  const [aiError, setAiError] = useState("");
  const [aiWarnings, setAiWarnings] = useState<string[]>([]);
  const [isAutoAiEnabled, setIsAutoAiEnabled] = useState(false);
  const [adviceApproved, setAdviceApproved] = useState(true);

  // Smart Trigger Tracking
  const lastAiHashRef = useRef("");

  // Draft Persistence (Cache) Logic
  useEffect(() => {
    const pId = searchParams.get("patientId") || "unlinked";
    const draftKey = `medienest care_rx_draft_${pId}`;
    const savedDraft = localStorage.getItem(draftKey);
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        if (draft.ptName) setPtName(draft.ptName);
        if (draft.ptPhone) setPtPhone(draft.ptPhone);
        if (draft.ptAge) setPtAge(draft.ptAge);
        if (draft.ptSex) setPtSex(draft.ptSex);
        if (draft.ptWeight) setPtWeight(draft.ptWeight);
        if (draft.ptBloodGroup) setPtBloodGroup(draft.ptBloodGroup);
        if (draft.cc) setCc(draft.cc);
        if (draft.findings) setFindings(draft.findings);
        if (draft.diagnosis) setDiagnosis(draft.diagnosis);
        if (draft.meds) setMeds(draft.meds);
        if (draft.mName) setMName(draft.mName);
        if (draft.mType) setMType(draft.mType);
        if (draft.mDose) setMDose(draft.mDose);
        if (draft.mFreq) setMFreq(draft.mFreq);
        if (draft.mDur) setMDur(draft.mDur);
        if (draft.mInst) setMInst(draft.mInst);
        if (draft.mNote) setMNote(draft.mNote);
        if (draft.advice) setAdvice(draft.advice);
        if (draft.followUp) setFollowUp(draft.followUp);
        if (draft.pendingAiMeds) setPendingAiMeds(draft.pendingAiMeds);
        if (draft.adviceApproved !== undefined)
          setAdviceApproved(draft.adviceApproved);
        console.log("Draft restored from cache");
      } catch (e) {
        console.error("Failed to restore draft:", e);
      }
    }
  }, []);

  useEffect(() => {
    const autoAi = localStorage.getItem("medienest care_auto_ai");
    if (autoAi !== null) setIsAutoAiEnabled(JSON.parse(autoAi));
  }, []);

  useEffect(() => {
    localStorage.setItem("medienest care_auto_ai", JSON.stringify(isAutoAiEnabled));
  }, [isAutoAiEnabled]);

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
          // Sync with DB values if they differ or weren't provided in URL
          if (!pName) setPtName(data.name || "");
          if (!pPhone) setPtPhone(data.contact || "");
          if (!pAge) setPtAge(data.age || "");
          if (!pSex) setPtSex(data.gender || "Male");
          if (!pBlood) setPtBloodGroup(data.blood_group || "");
          setPtWeight(data.weight || "");

          // Also fetch AI summary if available
          try {
            const res = await authenticatedFetch(
              `${API_BASE_URL}/api/patient-history/${data.id}`,
            );
            if (res.ok) {
              const historyData = await res.json();
              if (historyData && historyData.summary) {
                setPtSnapshot(historyData.summary);
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
  }, [searchParams, supabase]);

  // AI Auto-Trigger Effect (Smart Persistence)
  useEffect(() => {
    if (activeTab === "rx" && isAutoAiEnabled) {
      const currentHash = `${cc}|${findings}`;

      // Trigger if we have data AND it's different from our last successful run
      if ((cc || findings) && currentHash !== lastAiHashRef.current) {
        handleAiSuggest();
      }
    }
  }, [activeTab, isAutoAiEnabled, cc, findings]);

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
      pendingAiMeds,
      adviceApproved,
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
    pendingAiMeds,
    adviceApproved,
    savedRxId,
    searchParams,
  ]);

  // Auto-Select Doctor (Backend logic remains for database attribution)
  const selectedDoctorObj =
    doctors.length === 1
      ? doctors[0]
      : doctors.find((d) => d.id === searchParams.get("doctorId")) ||
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
      setAiDiagnosis("");
      setPtSnapshot(null);
      lastAiHashRef.current = ""; // Reset AI memory
    }
  };

  const handleAiSuggest = async () => {
    if (!cc && !findings) return;
    const currentHash = `${cc}|${findings}`;
    setIsAiLoading(true);
    setAiStatus("analyzing");
    setAiError("");
    setAiDiagnosis("");
    setAiDifferentials([]);
    setPrimaryInvestigations([]);
    setSecondaryInvestigations([]);
    setAiConfidence(0);
    setAiSeverity("");
    setAiValidationFlags([]);
    try {
      console.log("[Clinical AI Engine] Running production inference...");
      const res = await authenticatedFetch(
        `${API_BASE_URL}/api/recommendations/suggest`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cc,
            findings,
            age: ptAge,
            gender: ptSex.toLowerCase(),
            specialty: doctors?.[0]?.specialty || "General Practitioner",
          }),
        },
      );

      const data = await res.json();

      if (data.success && data.suggestions && !data.suggestions.error) {
        const {
          recommendations,
          advice: suggestedAdvice,
          probable_diagnosis,
        } = data.suggestions;

        // Set recommendations for the Guidance Cards
        if (recommendations && Array.isArray(recommendations)) {
          setPendingAiMeds(recommendations);
          if (recommendations.length === 0 && !probable_diagnosis)
            setAiStatus("no_suggestions");
          else setAiStatus("ready");
        }

        if (probable_diagnosis) setAiDiagnosis(probable_diagnosis);
        if (data.suggestions.differentials)
          setAiDifferentials(data.suggestions.differentials);
        if (data.suggestions.investigations) {
          setPrimaryInvestigations(
            data.suggestions.investigations.primary || [],
          );
          setSecondaryInvestigations(
            data.suggestions.investigations.secondary || [],
          );
        }
        if (data.suggestions.severity) setAiSeverity(data.suggestions.severity);
        if (data.suggestions.confidence)
          setAiConfidence(data.suggestions.confidence);

        if (suggestedAdvice) {
          setAdvice(suggestedAdvice);
          setAdviceApproved(false);
        }

        lastAiHashRef.current = currentHash;
      } else {
        setAiStatus("error");
        setAiError(data.suggestions?.error || "Service Unavailable");
      }
    } catch (err) {
      setAiStatus("error");
      setAiError("Connection failure");
      console.error("[AI] Communication failure:", err);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleApproveSuggestedMed = (med: any) => {
    // 1. Fill manual writing section
    skipSearchRef.current = true; // Prevent DB search from triggering on auto-fill
    setMName(med.name);
    setMType(med.type || med.dosage_form || "Tab");
    setMDose(med.dose || med.pack_size || "");
    setMNote("");

    // Remaining details left for doctor
    setMFreq("");
    setMDur("");
    setMInst("");

    // UI Feedback: Focus on Frequency for faster typing
    console.log("[UI] Auto-filled brand:", med.name);
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

    // Fetch AI Snapshot for selected patient
    try {
      const res = await authenticatedFetch(
        `${API_BASE_URL}/api/patient-history/${p.id}`,
      );
      const data = await res.json();
      if (data && data.summary) {
        setPtSnapshot(data.summary);
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

  const handleSave = async () => {
    // Safety check for unapproved AI suggestions
    if (!adviceApproved) {
      const confirmResult = await window.confirm(
        "The Clinical Advice box contains AI-generated content that hasn't been approved. Proceed and Save anyway?",
      );
      if (!confirmResult) return;
    }

    if (!ptName || !ptPhone) {
      alert("Please enter patient name.");
      return;
    }
    if (!selectedDoctorObj) {
      alert("Please select a consulting doctor.");
      return;
    }

    setIsSaving(true);
    const supabase = createClient();

    // STRICT SANITIZATION: Clean phone number to exactly 10 digits for DB constraint
    const cleanPhone = ptPhone.replace(/\D/g, "").slice(-10);
    if (cleanPhone.length !== 10) {
      alert("Please enter a valid 10-digit phone number.");
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
            doctor_id: selectedDoctorObj?.id || null,
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

      alert(
        "Prescription saved successfully! Patient marked as completed.\n\nYou can now Download PDF or share via WhatsApp.",
      );
    } catch (err: any) {
      console.error("Save error:", err);
      alert("Error: " + (err.message || "Check database permissions."));
    } finally {
      setIsSaving(false);
    }
  };

  const shareWhatsApp = () => {
    if (!savedRxId && !ptName) {
      alert("Please save the prescription first to generate a link.");
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
    const canvas = await html2canvas(rxPaperRef.current, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Prescription_${ptName}_${date}.pdf`);
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
        backHref={`/portal/doctor-dashboard${
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
                    <div className={styles.aiSnapshotBox}>
                      <div className={styles.snapshotHeader}>
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
                      </div>
                      <div className={styles.snapshotData}>
                        <strong>Recent Conditions:</strong>{" "}
                        {ptSnapshot.keyConditions?.join(", ")}
                        <br />
                        <strong>Maintenance Meds:</strong>{" "}
                        {ptSnapshot.currentMedications?.join(", ")}
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
                <div className={styles.panelBlock}>
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
                    </div>
                    <div className={styles.snapshotData}>
                      <strong>Recent Conditions:</strong>{" "}
                      {ptSnapshot.keyConditions?.join(", ")}
                      <br />
                      <strong>Maintenance Meds:</strong>{" "}
                      {ptSnapshot.currentMedications?.join(", ")}
                    </div>
                  </div>
                )}

                <div className={styles.panelBlock}>
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
                    <div className={styles.aiControlArea}>
                      <span className={styles.aiStatusLabel}>
                        {isAiLoading && (
                          <span className={styles.aiLoadingText}>
                            Analyzing...
                          </span>
                        )}
                        {!isAiLoading && aiStatus === "ready" && (
                          <span style={{ color: "#10b981" }}>
                            Suggestions Ready
                          </span>
                        )}
                        {!isAiLoading && aiStatus === "no_suggestions" && (
                          <span style={{ color: "#94a3b8" }}>
                            No suggestions found
                          </span>
                        )}
                        {!isAiLoading && aiStatus === "error" && (
                          <span style={{ color: "#ef4444" }}>
                            ️ AI Error: {aiError}
                          </span>
                        )}
                        {!isAiLoading && !aiStatus && "AI Auto-Suggest"}
                      </span>
                      <label className={styles.switch}>
                        <input
                          type="checkbox"
                          checked={isAutoAiEnabled}
                          onChange={(e) => setIsAutoAiEnabled(e.target.checked)}
                        />
                        <span
                          className={`${styles.slider} ${isAiLoading ? styles.sliderLoading : ""}`}
                        ></span>
                      </label>
                    </div>
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
                            <b style={{ color: "var(--teal)" }}>
                              {m.type}. {m.name}
                            </b>{" "}
                            {m.dose}
                            <div className={styles.mDetails}>
                              {m.freq} × {m.duration} · {m.instructions}
                            </div>
                            {m.note && (
                              <div className={styles.mNote}>Note: {m.note}</div>
                            )}
                          </div>
                          <button
                            className={styles.btnRemove}
                            onClick={() => removeMed(m.id)}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {(isAiLoading ||
                  pendingAiMeds.length > 0 ||
                  (advice && !adviceApproved)) &&
                  isAutoAiEnabled && (
                    <div
                      className={styles.auditContainer}
                      style={{
                        background: "#ffffff",
                        border: "1px solid #cbd5e1",
                        color: "#0f172a",
                        padding: "16px",
                        borderRadius: "12px",
                      }}
                    >
                      {aiDiagnosis && (
                        <div
                          className={styles.diagnosisArea}
                          style={{
                            background: "#eff6ff",
                            border: "1px solid #bfdbfe",
                            borderRadius: "12px",
                            padding: "12px",
                            marginBottom: "16px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: "8px",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                              }}
                            >
                              <p
                                style={{
                                  margin: 0,
                                  fontSize: "11px",
                                  color: "#1d4ed8",
                                  fontWeight: 800,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.05em",
                                }}
                              >
                                Probable Diagnosis
                              </p>
                              {aiSeverity && (
                                <span
                                  style={{
                                    fontSize: "9px",
                                    background:
                                      aiSeverity === "emergency"
                                        ? "#fee2e2"
                                        : aiSeverity === "moderate"
                                          ? "#fef9c3"
                                          : "#dcfce7",
                                    color:
                                      aiSeverity === "emergency"
                                        ? "#991b1b"
                                        : aiSeverity === "moderate"
                                          ? "#854d0e"
                                          : "#166534",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    fontWeight: 800,
                                    textTransform: "uppercase",
                                    border: "1px solid",
                                  }}
                                >
                                  {aiSeverity}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => setDiagnosis(aiDiagnosis)}
                              style={{
                                fontSize: "10px",
                                background: "#3b82f6",
                                color: "white",
                                border: "none",
                                padding: "4px 8px",
                                borderRadius: "4px",
                                fontWeight: 800,
                                cursor: "pointer",
                              }}
                            >
                              Apply
                            </button>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <p
                              style={{
                                margin: 0,
                                fontSize: "13px",
                                color: "#1e3a8a",
                                fontWeight: 700,
                              }}
                            >
                              {aiDiagnosis}
                            </p>
                            {aiConfidence > 0 && (
                              <p
                                style={{
                                  margin: 0,
                                  fontSize: "10px",
                                  color: "#60a5fa",
                                  fontWeight: 600,
                                }}
                              >
                                {Math.round(aiConfidence * 100)}% Confidence
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {aiDifferentials.length > 0 && (
                        <div
                          style={{
                            background: "#fff",
                            border: "1px solid #e2e8f0",
                            borderRadius: "12px",
                            padding: "12px",
                            marginBottom: "16px",
                          }}
                        >
                          <p
                            style={{
                              margin: "0 0 8px 0",
                              fontSize: "11px",
                              color: "#64748b",
                              fontWeight: 800,
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                            }}
                          >
                            ️ Differential Diagnoses
                          </p>
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: "6px",
                            }}
                          >
                            {aiDifferentials.map((diff, idx) => (
                              <span
                                key={idx}
                                style={{
                                  fontSize: "11px",
                                  background: "#f8fafc",
                                  color: "#475569",
                                  padding: "3px 8px",
                                  borderRadius: "6px",
                                  border: "1px solid #cbd5e1",
                                  fontWeight: 600,
                                }}
                              >
                                {diff}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {(primaryInvestigations.length > 0 ||
                        secondaryInvestigations.length > 0) && (
                        <div
                          style={{
                            background: "#f5f3ff",
                            border: "1px solid #ddd6fe",
                            borderRadius: "12px",
                            padding: "12px",
                            marginBottom: "16px",
                          }}
                        >
                          <p
                            style={{
                              margin: "0 0 12px 0",
                              fontSize: "11px",
                              color: "#6d28d9",
                              fontWeight: 800,
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                            }}
                          >
                            Suggested Investigations
                          </p>

                          {primaryInvestigations.length > 0 && (
                            <div
                              style={{
                                marginBottom:
                                  secondaryInvestigations.length > 0
                                    ? "12px"
                                    : 0,
                              }}
                            >
                              <p
                                style={{
                                  margin: "0 0 6px 0",
                                  fontSize: "10px",
                                  color: "#7c3aed",
                                  fontWeight: 700,
                                  textTransform: "uppercase",
                                }}
                              >
                                Essential (Primary)
                              </p>
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "4px",
                                }}
                              >
                                {primaryInvestigations.map((test, idx) => (
                                  <div
                                    key={idx}
                                    style={{
                                      fontSize: "12px",
                                      color: "#5b21b6",
                                      fontWeight: 600,
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "6px",
                                    }}
                                  >
                                    <span style={{ color: "#a78bfa" }}>•</span>{" "}
                                    {test}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {secondaryInvestigations.length > 0 && (
                            <div>
                              <p
                                style={{
                                  margin: "0 0 6px 0",
                                  fontSize: "10px",
                                  color: "#94a3b8",
                                  fontWeight: 700,
                                  textTransform: "uppercase",
                                }}
                              >
                                Further Workup (Secondary)
                              </p>
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "4px",
                                }}
                              >
                                {secondaryInvestigations.map((test, idx) => (
                                  <div
                                    key={idx}
                                    style={{
                                      fontSize: "12px",
                                      color: "#64748b",
                                      fontWeight: 500,
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "6px",
                                    }}
                                  >
                                    <span style={{ color: "#cbd5e1" }}>•</span>{" "}
                                    {test}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {pendingAiMeds.length > 0 && (
                        <div
                          className={styles.suggestedMedsArea}
                          style={{ marginBottom: advice ? "24px" : 0 }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: 12,
                            }}
                          >
                            <p
                              style={{
                                margin: 0,
                                fontSize: "11px",
                                color: "#6366f1",
                                fontWeight: 800,
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                              }}
                            >
                              Clinical Guidance Cards
                            </p>
                            <button
                              onClick={() => setPendingAiMeds([])}
                              className={styles.btnClearAudit}
                              style={{
                                fontSize: "10px",
                                background: "none",
                                border: "none",
                                color: "#94a3b8",
                                cursor: "pointer",
                              }}
                            >
                              Clear All
                            </button>
                          </div>

                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "12px",
                            }}
                          >
                            {pendingAiMeds.map((rec) => (
                              <div
                                key={rec.drug}
                                className={styles.guidanceCard}
                                style={{
                                  background: "#f8fafc",
                                  border: "1px solid #e2e8f0",
                                  borderRadius: "12px",
                                  padding: "12px",
                                }}
                              >
                                <div style={{ marginBottom: "8px" }}>
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "6px",
                                      marginBottom: "2px",
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: "12px",
                                        fontWeight: 800,
                                        color: "#1e293b",
                                      }}
                                    >
                                      {rec.drug}
                                    </span>
                                    <span
                                      style={{
                                        fontSize: "9px",
                                        background: "#e0e7ff",
                                        color: "#4338ca",
                                        padding: "1px 6px",
                                        borderRadius: "4px",
                                        fontWeight: 700,
                                      }}
                                    >
                                      GENERIC
                                    </span>
                                  </div>
                                  <p
                                    style={{
                                      margin: 0,
                                      fontSize: "11.5px",
                                      color: "#64748b",
                                      lineHeight: 1.4,
                                    }}
                                  >
                                    {rec.reason}
                                  </p>
                                </div>

                                {rec.brands && rec.brands.length > 0 ? (
                                  <div
                                    style={{
                                      display: "flex",
                                      flexWrap: "wrap",
                                      gap: "6px",
                                    }}
                                  >
                                    {rec.brands.map((brand: any) => (
                                      <button
                                        key={brand.id}
                                        onClick={() =>
                                          handleApproveSuggestedMed({
                                            ...brand,
                                            type: brand.dosage_form || "Tab",
                                            dose: brand.pack_size || "",
                                          })
                                        }
                                        style={{
                                          padding: "5px 10px",
                                          background: "#ffffff",
                                          border: "1px solid #cbd5e1",
                                          borderRadius: "6px",
                                          fontSize: "11px",
                                          fontWeight: 700,
                                          color: "#334155",
                                          cursor: "pointer",
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "4px",
                                          transition: "0.2s",
                                        }}
                                        onMouseOver={(e) => {
                                          e.currentTarget.style.borderColor =
                                            "#6366f1";
                                          e.currentTarget.style.color =
                                            "#6366f1";
                                        }}
                                        onMouseOut={(e) => {
                                          e.currentTarget.style.borderColor =
                                            "#cbd5e1";
                                          e.currentTarget.style.color =
                                            "#334155";
                                        }}
                                      >
                                        <span>{brand.emoji || ""}</span>{" "}
                                        {brand.name}
                                      </button>
                                    ))}
                                  </div>
                                ) : (
                                  <div
                                    style={{
                                      fontSize: "10px",
                                      color: "#94a3b8",
                                      fontStyle: "italic",
                                    }}
                                  >
                                    No matches in inventory.
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {advice && !adviceApproved && (
                        <div
                          className={styles.adviceDraftArea}
                          style={{
                            background: "#f8fafc",
                            padding: "16px",
                            borderRadius: "12px",
                            border: "1px solid #e2e8f0",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: "8px",
                            }}
                          >
                            <p
                              style={{
                                fontSize: "11px",
                                color: "#6366f1",
                                fontWeight: 800,
                                margin: 0,
                              }}
                            >
                              AI CLINICAL GUIDANCE
                            </p>
                            <span
                              style={{
                                fontSize: "9px",
                                background: "#e0e7ff",
                                color: "#4338ca",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                fontWeight: 700,
                              }}
                            >
                              DRAFT
                            </span>
                          </div>
                          <div
                            style={{
                              fontSize: "13px",
                              whiteSpace: "pre-line",
                              color: "#334155",
                              lineHeight: 1.5,
                              marginBottom: "12px",
                            }}
                          >
                            {advice}
                          </div>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button
                              onClick={() => setAdviceApproved(true)}
                              style={{
                                flex: 1,
                                padding: "8px",
                                background: "#10b981",
                                color: "white",
                                border: "none",
                                borderRadius: "6px",
                                fontSize: "12px",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              Accept Advice
                            </button>
                            <button
                              onClick={() => {
                                setAdvice("");
                                setAdviceApproved(true);
                              }}
                              style={{
                                padding: "8px 12px",
                                background: "#f1f5f9",
                                color: "#64748b",
                                border: "none",
                                borderRadius: "6px",
                                fontSize: "12px",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

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
                      Final Advice & Follow-up
                    </h3>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      {!adviceApproved && (
                        <>
                          <button
                            onClick={() => setAdviceApproved(true)}
                            className={styles.btnApprove}
                          >
                            Approve AI Advice
                          </button>
                          <button
                            onClick={() => {
                              setAdvice("");
                              setAdviceApproved(true);
                            }}
                            className={styles.btnReject}
                            style={{
                              background: "#fee2e2",
                              color: "#dc2626",
                              border: "1px solid #fecaca",
                            }}
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="field">
                    <textarea
                      rows={5}
                      value={advice}
                      onChange={(e) => {
                        setAdvice(e.target.value);
                        // If user manual edits it after AI fill, we consider it their version or at least seen
                        if (!adviceApproved) setAdviceApproved(true);
                      }}
                      placeholder="Advice..."
                      className={!adviceApproved ? styles.unapprovedAdvice : ""}
                    />
                    {!adviceApproved && (
                      <div
                        className={styles.auditVerdict}
                        style={{ marginTop: 8, padding: "8px 12px" }}
                      >
                        ️ AI Generated Advice - Please verify before saving.
                      </div>
                    )}
                  </div>
                  <div className="field">
                    <label>Specific Follow-up Date</label>
                    <input
                      type="date"
                      value={followUp}
                      onChange={(e) => setFollowUp(e.target.value)}
                    />
                  </div>
                </div>
                <div className={styles.exportRow}>
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
              </div>
            )}
          </div>

          {/* Preview Side - Enhanced Professional Template */}
          <div className={styles.previewPanel}>
            <div className={styles.rxCard} ref={rxPaperRef} id="rx-preview">
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
          </div>
        </div>
      </main>
    </div>
  );
}
