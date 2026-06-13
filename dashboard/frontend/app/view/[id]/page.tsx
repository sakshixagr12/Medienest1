"use client";

import { useEffect, useState, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { API_BASE_URL } from "@/lib/api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { CheckCircle2, ShieldCheck, Lock, Headphones, AlertTriangle } from "lucide-react";
import styles from "./page.module.css";
import DemoViewTour from "@/components/demo/DemoViewTour";

// ── CUSTOM SVG LEAVES FOR BACKGROUND ──
function LeavesBackground({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M0 160 C 25 135, 55 115, 95 105" stroke="#2E7D32" strokeWidth="2.5" strokeLinecap="round" opacity="0.15" />
      <path d="M15 155 C 28 128, 48 123, 52 143 C 37 148, 22 153, 15 155 Z" fill="url(#leafGrad)" opacity="0.2" />
      <path d="M45 125 C 65 102, 80 107, 75 128 C 58 128, 48 128, 45 125 Z" fill="url(#leafGrad)" opacity="0.2" />
      <defs>
        <linearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#81C784" />
          <stop offset="100%" stopColor="#2E7D32" />
        </linearGradient>
      </defs>
    </svg>
  );
}

interface Prescription {
  id: string;
  date: string;
  weight: string;
  complaints: string;
  findings: string;
  medicines: any[];
  advice: string;
  valid_till: string;
  doctor_name: string;
  doctor_id?: string;
  patient_id: string;
  clinic_id: string;
  diagnosis?: string;
  ai_summary: any;
  guidance_sheet?: any;
}

interface Patient {
  name: string;
  age: string;
  gender: string;
  contact: string;
  blood_group: string;
  created_at: string;
}

interface Clinic {
  name: string;
  address: string;
  phone: string;
  tagline: string;
}

export default function ViewPrescription({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [rx, setRx] = useState<Prescription | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [history, setHistory] = useState<any>(null);
  const [doctor, setDoctor] = useState<any>(null);
  const [showDocProfile, setShowDocProfile] = useState(false);

  const hospitalName = clinic?.name || "MedieNest Partner Clinic";
  const hospitalLocation = clinic?.address || "Location not set";

  // --- HYDRATION GUARD ---
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // --- AI SNAPSHOT STATE ---
  const activeSummary = rx?.ai_summary;

  // --- TABS & HISTORY ---
  const [activeTab, setActiveTab] = useState<
    | "Patient Profile"
    | "Current Script"
    | "Care Guidance"
    | "AI Summary"
    | "Patient History"
    | "Drug Interaction"
    | "Clinic Notes"
  >("Current Script");
  const [loadingHistory, setLoadingHistory] = useState(false);

  // --- TTS & LANGUAGE STATE ---
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showSpeechPopup, setShowSpeechPopup] = useState(false);
  const [selectedLang, setSelectedLang] = useState("English");
  const [showLangModal, setShowLangModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const translations: Record<string, any> = {
    Hindi: {
      // Navigation
      hub: "रोगी हब",
      profile: "रोगी प्रोफ़ाइल",
      script: "वर्तमान पर्चा",
      summary: "एआई सारांश",
      history: "रोगी का इतिहास",
      timelineView: "टाइमलाइन दृश्य",
      guidance: "देखभाल मार्गदर्शन",

      // Top Actions
      exportPdf: "पीडीएफ निर्यात करें",
      doctorInfo: "डॉक्टर की जानकारी",
      printRecord: "रिकॉर्ड प्रिंट करें",
      digitalCopy: "डिजिटल कॉपी",

      // Patient Profile
      vitalBiometrics: "महत्त्वपूर्ण बायोमेट्रिक्स",
      age: "आयु",
      sex: "लिंग",
      weight: "वजन",
      height: "ऊंचाई",
      verifiedPatient: "सत्यापित रोगी",
      yrs: "वर्ष",
      keyConditions: "प्रमुख नैदानिक स्थितियां",
      assessmentPending: "मूल्यांकन लंबित",
      maintenanceMeds: "वर्तमान दवाएं",
      viewHistory: "इतिहास देखें",
      dosage: "रखरखाव खुराक",
      noMeds: "नैदानिक इतिहास में कोई दवा सूचीबद्ध नहीं है।",
      clinicalSnapshot: "नैदानिक सारांश (एआई)",
      noSnapshot: "इस रोगी के लिए अभी तक कोई नैदानिक सारांश उपलब्ध नहीं है।",
      quickDemo: "त्वरित जनसांख्यिकी",
      regDate: "पंजीकरण तिथि",
      prefLang: "पसंद की भाषा",
      resStatus: "आवासीय स्थिति",
      permanent: "स्थायी",

      // Current Script
      cc: "मुख्य शिकायतें (C/C)",
      findings: "निष्कर्ष (O/E)",
      diagnosis: "निदान",
      adv: "सलाह/निर्देश (Adv.)",
      noMedicines: "कोई विशिष्ट दवाएं निर्धारित नहीं हैं।",
      clinicalRecord: "डिजिटल क्लिनिकल रिकॉर्ड",

      // History
      consultation: "परामर्श",
      prescribed: "निर्धारित दवाएं",
      noMedsPrescribed: "कोई दवा निर्धारित नहीं",
      viewFullRx: "पूरा पर्चा देखें",
      retrieving: "नैदानिक रिकॉर्ड प्राप्त किया जा रहा है...",
      noPastVisits: "कोई पिछला दौरा नहीं मिला।",
      firstVisit: "यह पहला दर्ज किया गया दौरा प्रतीत होता है।",

      // AI Section
      medicines: "आपकी दवाएं",
      care: "देखभाल और आहार निर्देश",
      expectations: "क्या उम्मीद करें",
      warnings: "चेतावनी के संकेत",
      condition: "आपकी स्थिति",
      nextSteps: "अगले कदम",
      tagline: "सुरक्षित एआई एजेंट रिकॉर्ड",

      // Modals
      selectLang: "भाषा चुनें",
      chooseLang: "अपनी पसंदीदा भाषा चुनें",
      continueEng: "अंग्रेजी में जारी रखें",
      docProfile: "डॉक्टर की प्रोफ़ाइल",
      qualification: "योग्यता",
      regNo: "पंजीकरण संख्या",
      consultFee: "मानक परामर्श शुल्क",
      closeProfile: "प्रोफ़ाइल बंद करें",
      loadingRecords: "इलेक्ट्रॉनिक स्वास्थ्य रिकॉर्ड लोड हो रहा है...",
      oops: "क्षमा करें!",
      accessDenied: "पहुंच अस्वीकृत या रिकॉर्ड नहीं मिला।",
      retry: "पुनः प्रयास करें",
      patientID: "रोगी आईडी",
      name: "नाम",
      ageSex: "आयु/लिंग",
      wt: "वजन",
      bGrp: "रक्त समूह",
      dateLabel: "दिनांक",
      by: "द्वारा",
      aiPreparing: "एआई सहायक आपका गाइड तैयार कर रहा है...",
      aiAnalyzing:
        "पर्चे के डेटा का विश्लेषण और वास्तविक समय में आपका व्यक्तिगत देखभाल सारांश तैयार किया जा रहा है।",
      tapToListen: "सुनने के लिए टैप करें",
      stopListen: "सुनना बंद करें",
      listenSummary: "सारांश सुनें",
    },
    English: {
      hub: "Patient Hub",
      profile: "Patient Profile",
      script: "Current Script",
      summary: "AI Summary",
      history: "Patient History",
      timelineView: "Timeline View",
      guidance: "Care Guidance",
      exportPdf: "Export PDF",
      doctorInfo: "Doctor Info",
      printRecord: "Print Record",
      digitalCopy: "Digital Copy",
      vitalBiometrics: "Vital Biometrics",
      age: "AGE",
      sex: "SEX",
      weight: "WEIGHT",
      height: "HEIGHT",
      verifiedPatient: "Verified Patient",
      yrs: "Yrs",
      keyConditions: "Key Clinical Conditions",
      assessmentPending: "Assessment Pending",
      maintenanceMeds: "Current Meds",
      viewHistory: "View History",
      dosage: "Maintenance Dosage",
      noMeds: "No maintenance medications listed in clinical history.",
      clinicalSnapshot: "Clinical Snapshot (AI)",
      noSnapshot: "No clinical snapshot available for this patient yet.",
      quickDemo: "Quick Demographics",
      regDate: "Registration Date",
      prefLang: "Preferred Language",
      resStatus: "Residential Status",
      permanent: "Permanent",
      cc: "C/C (CHIEF COMPLAINTS)",
      findings: "FINDINGS (O/E)",
      diagnosis: "DIAGNOSIS",
      adv: "Adv. (Advice/Instructions)",
      noMedicines: "No specific medicines prescribed.",
      clinicalRecord: "Digital Clinical Record",
      consultation: "Consultation",
      prescribed: "Medicines Prescribed",
      noMedsPrescribed: "No medication prescribed",
      viewFullRx: "View Full Prescription",
      retrieving: "Retrieving clinical records...",
      noPastVisits: "No past visits found.",
      firstVisit: "This appears to be the first recorded visit.",
      medicines: "YOUR MEDICINES",
      care: "CARE & DIET INSTRUCTIONS",
      expectations: "WHAT TO EXPECT",
      warnings: "WARNING SIGNS",
      condition: "CONDITION INSIGHT",
      nextSteps: "NEXT STEPS",
      tagline: "Secure AI Agent Record",
      selectLang: "Select Language",
      chooseLang: "Choose your preferred language",
      continueEng: "Continue in English",
      docProfile: "Doctor Profile",
      qualification: "Qualification",
      regNo: "Registration No.",
      consultFee: "Standard Consultation Fee",
      closeProfile: "Close Profile",
      loadingRecords: "Loading electronic health records...",
      oops: "Oops!",
      accessDenied: "Access denied or records not found.",
      retry: "Retry Access",
      patientID: "Patient ID",
      name: "NAME",
      ageSex: "AGE/SEX",
      wt: "WT",
      bGrp: "B.GRP",
      dateLabel: "DATE",
      by: "By",
      aiPreparing: "AI Assistant is preparing your guide...",
      aiAnalyzing:
        "Analyzing prescription data and crafting your personalized care summary in real-time.",
      tapToListen: "Tap to Listen",
      stopListen: "Stop Listening",
      listenSummary: "Listen to Summary",
    },
  };

  const t = translations[selectedLang] || translations["English"];

  // Load language from storage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedLang = sessionStorage.getItem(`lang-${id}`);
      if (savedLang) setSelectedLang(savedLang);
    }
  }, [id]);

  const languages = [
    { name: "English", sub: "Default", icon: "🇬🇧", code: "en-US" },
    { name: "Hindi", sub: "हिन्दी", icon: "🇮🇳", code: "hi-IN" },
  ];

  // Show language modal for patients on landing
  useEffect(() => {
    if (!user && mounted && activeTab === "AI Summary") {
      const hasSeenModal = sessionStorage.getItem(`langModalSeen-${id}`);
      if (!hasSeenModal) {
        setShowLangModal(true);
      }
    }
  }, [mounted, activeTab, !!user]);

  const handleLangSelect = (lang: string) => {
    if (isGenerating) return;
    setSelectedLang(lang);
    setShowLangModal(false);
    sessionStorage.setItem(`langModalSeen-${id}`, "true");
    sessionStorage.setItem(`lang-${id}`, lang);
    // Trigger regeneration in specific language
    if (rx) {
      setRx((prev) => (prev ? { ...prev, ai_summary: null } : null)); // Show loader
      generateAiSummary(rx, patient, lang);
    }
  };

  // Show popup after a delay when AI Summary is active
  useEffect(() => {
    if (
      activeTab === "AI Summary" &&
      activeSummary &&
      !isSpeaking &&
      !showLangModal
    ) {
      const timer = setTimeout(() => setShowSpeechPopup(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [activeTab, !!activeSummary, isSpeaking, showLangModal]);

  async function fetchHistory() {
    if (id === "ae1163db-5002-4341-9cfe-535860ce2593") {
      setHistory({
        summary: {
          keyConditions: ["Seasonal Asthma", "Dust Allergy"],
          currentMedications: ["Inhaler Budecort 200 (1 puff SOS)", "Tab. Cetirizine 10mg (1hs)"],
          allergies: ["Penicillin"],
          recentVisitsSummary: "Patient complains of persistent dry cough, moderate wheezing, and fever (102F) since 3 days."
        },
        visits: [
          {
            visit_date: "2026-05-10T10:00:00.000Z",
            doctor: "Dr. Gopal Shukla",
            complaints: "Mild dry cough, runny nose, seasonal asthma flare-up due to high pollen levels."
          },
          {
            visit_date: "2026-03-15T09:45:00.000Z",
            doctor: "Dr. Gopal Shukla",
            complaints: "Routine health checkup, asthma symptoms well-controlled, Cetirizine refilled."
          }
        ]
      });
      return;
    }
    setLoadingHistory(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/public/patient-history/${id}`);
      if (!res.ok) {
        console.warn(
          "⚠️ Clinical history API error - falling back to degraded mode",
        );
        return;
      }
      const data = await res.json();
      if (data) setHistory(data);
    } catch (err) {
      console.error("Network error fetching clinical history:", err);
    } finally {
      setLoadingHistory(false);
    }
  }

  async function generateAiSummary(
    currentRx: Prescription,
    pt: Patient | null,
    lang: string = "English",
  ) {
    if (isGenerating) return;
    setIsGenerating(true);

    // Dynamic Language Support

    // Hardened Retry Wrapper
    const fetchWithRetry = async (
      url: string,
      opts: any,
      retries = 2,
    ): Promise<any> => {
      for (let i = 0; i <= retries; i++) {
        try {
          const res = await fetch(url, opts);
          if (res.ok) return await res.json();
          if (i === retries)
            throw new Error(`Fetch failed with status: ${res.status}`);
        } catch (err) {
          if (i === retries) throw err;
          console.warn(`️ Retrying AI Generation (${i + 1}/${retries})...`);
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    };

    try {
      console.log(`Triggering AI Clinical Snapshot...`);
      const result = await fetchWithRetry(
        `${API_BASE_URL}/api/prescriptions/${id}/ai-summary`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patientName: pt?.name || "Patient",
            complaints: currentRx.complaints,
            findings: currentRx.findings,
            medicines:
              typeof currentRx.medicines === "string"
                ? JSON.parse(currentRx.medicines)
                : currentRx.medicines,
            advice: currentRx.advice,
            followUp: currentRx.valid_till,
            lang: lang,
            persist: lang === "English", // Only persist English as default
          }),
        },
      );

      if (result?.success && result.summary) {
        console.log(`AI Summary Generated:`, result);
        setRx((prev) =>
          prev ? { ...prev, ai_summary: result.summary } : null,
        );
      }
    } catch (err) {
      console.error(`AI Trigger Error:`, err);
    } finally {
      setIsGenerating(false);
    }
  }

  async function fetchRxData() {
    const supabase = createClient();
    try {
      console.log("Fetching/Refreshing RX data...");

      // Fetch session for conditional UI
      const {
        data: { session },
      } = await supabase.auth.getSession();
      let authUser = session?.user || null;
      if (!authUser) {
        try {
          const {
            data: { user: verifiedUser },
          } = await supabase.auth.getUser();
          authUser = verifiedUser;
        } catch (e) {
          // Silent catch for guest / public viewers
        }
      }
      setUser(authUser);

      const { data: rxData, error: rxError } = await supabase
        .from("prescriptions")
        .select("*")
        .eq("id", id)
        .single();

      if (rxError) throw rxError;
      setRx(rxData);

      if (rxData.patient_id) {
        const { data: pData } = await supabase
          .from("patients")
          .select("*")
          .eq("id", rxData.patient_id)
          .single();
        if (pData) setPatient(pData);
        // Fetch history immediately
        fetchHistory();
      }
      if (rxData.clinic_id) {
        const { data: cData } = await supabase
          .from("clinics")
          .select("*")
          .eq("id", rxData.clinic_id)
          .single();
        if (cData) setClinic(cData);
      }
      if (id === "ae1163db-5002-4341-9cfe-535860ce2593") {
        setDoctor({
          id: "demo-doc-gopal",
          doctor_id: "demo-doc-gopal",
          user_id: "demo-user-gopal",
          name: "Gopal Shukla",
          qualification: "MBBS, MD (General Medicine)",
          specialty: "General Medicine",
          contact: "+91 73805 20394",
          email: "shuklagopal1244@gmail.com",
          is_active: true,
          display_order: 1
        });
      } else {
        // Fetch doctor profile via backend API (bypasses RLS)
        try {
          const docRes = await fetch(
            `${API_BASE_URL}/api/doctor-profile-by-rx/${id}`,
          );
          if (docRes.ok) {
            const docJson = await docRes.json();
            if (docJson.success && docJson.doctor) setDoctor(docJson.doctor);
          }
        } catch (docErr) {
          console.warn("️ Could not fetch doctor profile:", docErr);
        }
      }
    } catch (err: any) {
      console.error("Fetch error:", err);
      setError(err.message || "Prescription not found");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function init() {
      await fetchRxData();
    }
    init();

    const supabase = createClient();
    const channel = supabase
      .channel(`rx-update-${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "prescriptions",
          filter: `id=eq.${id}`,
        },
        () => {
          console.log("Realtime Update Detected! Re-fetching...");
          fetchRxData();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  useEffect(() => {
    async function triggerSequentially() {
      if (!rx || loading || isGenerating) return;

      // AI Priority & Self-Healing
      if (!rx.ai_summary) {
        console.log("⏱️ AI Snapshot fetch starting...");
        await generateAiSummary(rx, patient, selectedLang);
      }
    }

    triggerSequentially();
  }, [rx?.id, !!rx?.ai_summary, loading, selectedLang]);

  const followUpDate = rx?.valid_till;
  const meds = rx?.medicines
    ? typeof rx.medicines === "string"
      ? JSON.parse(rx.medicines)
      : rx.medicines
    : [];

  // --- TTS HANDLER ---
  const handleToggleSpeech = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    if (!activeSummary) return;

    const isHindi =
      activeSummary?.greeting && /[\u0900-\u097F]/.test(activeSummary.greeting);

    // Construct the script
    let script = "";
    if (isHindi) {
      script = `${activeSummary.greeting}. आपकी स्थिति के बारे में: ${activeSummary.condition}. `;
      if (activeSummary.medicines?.length > 0) {
        script += "आपकी दवाइयाँ हैं: ";
        activeSummary.medicines.forEach((m: any) => {
          script += `${m.name}, ${m.purpose}. `;
        });
      }
      script += `रिकवरी के बारे में: ${activeSummary.expectations}. मुख्य सलाह: ${activeSummary.care}.`;
    } else {
      script = `${activeSummary.greeting}. Regarding your condition: ${activeSummary.condition}. `;
      if (activeSummary.medicines?.length > 0) {
        script += "Your prescribed medicines are: ";
        activeSummary.medicines.forEach((m: any) => {
          script += `${m.name}, which is for ${m.purpose}. `;
        });
      }
      script += `What to expect: ${activeSummary.expectations}. General care advice: ${activeSummary.care}.`;
    }

    // Remove emojis to prevent TTS from reading them literally (e.g., "haath hilana")
    const cleanScript = script.replace(
      /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu,
      "",
    );
    const utterance = new SpeechSynthesisUtterance(cleanScript);

    // Find matching voice for selected language
    const langConfig =
      languages.find((l) => l.name === selectedLang) || languages[0];
    utterance.lang = langConfig.code;
    utterance.rate = 0.85; // Slightly slower for Indian regional nuances

    // Voice selection logic
    const voices = window.speechSynthesis.getVoices();
    const targetVoice = voices.find(
      (v) =>
        v.lang.startsWith(langConfig.code.slice(0, 2)) ||
        v.name.toLowerCase().includes(selectedLang.toLowerCase()),
    );

    if (targetVoice) {
      utterance.voice = targetVoice;
    } else if (selectedLang === "Bhojpuri") {
      // Fallback for Bhojpuri to Hindi voice
      const hiVoice = voices.find((v) => v.lang.startsWith("hi"));
      if (hiVoice) utterance.voice = hiVoice;
    }

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
    setShowSpeechPopup(false);
  };

  if (!mounted) return null;

  const sidebarItems = [
    {
      name: "Patient Profile",
      icon: (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
    {
      name: "Current Script",
      icon: (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <line x1="10" y1="9" x2="8" y2="9" />
        </svg>
      ),
    },
    ...(rx?.guidance_sheet ? [
      {
        name: "Care Guidance",
        icon: (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" />
            <path d="M12 7v10" />
            <path d="M8 11h8" />
          </svg>
        ),
      }
    ] : []),
    ...(id !== "ae1163db-5002-4341-9cfe-535860ce2593" ? [
      {
        name: "AI Summary",
        icon: (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            <path d="M5 3v4" />
            <path d="M19 17v4" />
            <path d="M3 5h4" />
            <path d="M17 19h4" />
          </svg>
        ),
      }
    ] : []),
    {
      name: "Patient History",
      icon: (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
  ];

  if (!user || id === "ae1163db-5002-4341-9cfe-535860ce2593") {
    return (
      <div className={styles.patientHubBg}>
        {/* Background decorations */}
        <div className={styles.stethoscopeBgDecoration}>
          <Image
            src="/assets/stethoscope_bg.png"
            alt="Stethoscope Decoration"
            width={380}
            height={380}
            style={{ objectFit: 'contain', opacity: 0.15 }}
          />
        </div>
        <div className={styles.plantBgDecoration}>
          <Image
            src="/assets/plant_cross_bg.png"
            alt="Potted Plant Decoration"
            width={340}
            height={340}
            style={{ objectFit: 'contain', opacity: 0.25 }}
          />
        </div>

        {/* Floating Capsule Navigation Bar */}
        <nav className={styles.navbar}>
          <div className={styles.navContainer}>
            <div className={styles.brand}>
              <Image
                src="/assets/medienest_logo.png"
                alt="MedieNest Logo"
                width={28}
                height={28}
                style={{ objectFit: "contain" }}
              />
              <span className={styles.brandName}>MedieNest</span>
            </div>

            {/* Language Selector */}
            <div className={styles.navRight}>
              <button
                className={styles.langBtn}
                onClick={() => setShowLangModal(true)}
              >
                <span>{selectedLang === "Hindi" ? "हिन्दी" : "English"}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: 6 }}>
                  <path d="m6 9 6 6 6-6"/>
                </svg>
              </button>
            </div>
          </div>
        </nav>

        {/* Main Content Hub */}
        <div className={styles.container}>
          {loading ? (
            <div className={styles.loadingContainer} style={{ textAlign: "center", padding: "100px 40px" }}>
              <div className="spinner" style={{ width: "40px", height: "40px", borderTopColor: "#2E7D32", margin: "0 auto" }} />
              <p style={{ marginTop: 16, color: "var(--text-soft)", fontWeight: 600 }}>{t.loadingRecords}</p>
            </div>
          ) : error || !rx ? (
            <div className={styles.errorContainer} style={{ textAlign: "center", padding: "100px 40px" }}>
              <h2 style={{ fontSize: 28, fontWeight: 900, color: "#EF4444", margin: 0 }}>{t.oops}</h2>
              <p style={{ color: "var(--text-soft)", margin: "8px 0 24px 0" }}>{error || t.accessDenied}</p>
              <button className={styles.retryBtn} onClick={() => window.location.reload()}>
                {t.retry}
              </button>
            </div>
          ) : (
            <>
              {/* Title & Hub Header */}
              <div className={styles.titleArea}>
                <div className={styles.successBadge}>
                  <CheckCircle2 size={14} style={{ marginRight: '6px', color: '#2E7D32' }} /> Verified Prescription
                </div>
                <h1>
                  {hospitalName}<br />
                  <span className={styles.italicGreen}>Patient Health Hub</span>
                </h1>
                <p>Consultation by <strong>{rx.doctor_name || "Consulting Physician"}</strong> on {new Date(rx.date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
              </div>

              {/* Sliding Capsule Navigation Tabs */}
              <div className={styles.horizontalNav}>
                {sidebarItems.map((item) => (
                  <button
                    key={item.name}
                    className={`${styles.horizontalNavItem} ${activeTab === item.name ? styles.horizontalNavItemActive : ""}`}
                    onClick={() => setActiveTab(item.name as any)}
                    data-tour={`view-tab-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <span className={styles.sideIcon} style={{ marginRight: 6 }}>{item.icon}</span>
                    <span className={styles.sideLabel}>
                      {item.name === "Patient Profile"
                        ? t.profile
                        : item.name === "Current Script"
                          ? t.script
                          : item.name === "AI Summary"
                            ? t.summary
                            : item.name === "Patient History"
                              ? t.history
                              : item.name === "Care Guidance"
                                ? t.guidance
                                : item.name}
                    </span>
                  </button>
                ))}
              </div>

              {/* Central Card */}
              <div className={styles.patientCard}>
                {/* Decorative leaves inside card */}
                <LeavesBackground className={styles.leavesCardCornerLeft} />
                
                {/* Tab Contents */}
                {activeTab === "Patient Profile" && (
                  <div className={styles.tabContent}>
                    {/* Render patient details beautifully */}
                    <div style={{ display: "flex", gap: "24px", alignItems: "center", marginBottom: "32px", borderBottom: "1px solid #f1f5f9", paddingBottom: "24px" }}>
                      <div className={styles.patientAvatar}>
                        {patient?.name?.[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: "12px", fontWeight: "bold", color: "#2E7D32", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>{t.verifiedPatient}</div>
                        <h2 style={{ margin: 0, fontSize: "24px", fontWeight: 900, color: "#1F2937" }}>{patient?.name}</h2>
                        <div style={{ display: "flex", gap: "12px", fontSize: "14px", color: "#6B7280", marginTop: "4px", fontWeight: 500 }}>
                          <span>{patient?.age} Yrs</span>
                          <span>•</span>
                          <span>{patient?.gender}</span>
                          <span>•</span>
                          <span>ID: {rx.patient_id.slice(0, 8).toUpperCase()}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "16px", marginBottom: "32px" }}>
                      <div style={{ background: "#F9FAFB", padding: "16px", borderRadius: "16px", border: "1px solid #F3F4F6", textAlign: "center" }}>
                        <div style={{ fontSize: "11px", fontWeight: "bold", color: "#9CA3AF", textTransform: "uppercase" }}>{t.age}</div>
                        <div style={{ fontSize: "20px", fontWeight: 900, color: "#1F2937", marginTop: "4px" }}>{patient?.age || "—"}</div>
                      </div>
                      <div style={{ background: "#F9FAFB", padding: "16px", borderRadius: "16px", border: "1px solid #F3F4F6", textAlign: "center" }}>
                        <div style={{ fontSize: "11px", fontWeight: "bold", color: "#9CA3AF", textTransform: "uppercase" }}>{t.sex}</div>
                        <div style={{ fontSize: "20px", fontWeight: 900, color: "#1F2937", marginTop: "4px" }}>{patient?.gender || "—"}</div>
                      </div>
                      <div style={{ background: "#F9FAFB", padding: "16px", borderRadius: "16px", border: "1px solid #F3F4F6", textAlign: "center" }}>
                        <div style={{ fontSize: "11px", fontWeight: "bold", color: "#9CA3AF", textTransform: "uppercase" }}>{t.weight}</div>
                        <div style={{ fontSize: "20px", fontWeight: 900, color: "#1F2937", marginTop: "4px" }}>{rx.weight ? `${rx.weight} Kg` : "—"}</div>
                      </div>
                      <div style={{ background: "#F9FAFB", padding: "16px", borderRadius: "16px", border: "1px solid #F3F4F6", textAlign: "center" }}>
                        <div style={{ fontSize: "11px", fontWeight: "bold", color: "#9CA3AF", textTransform: "uppercase" }}>{t.bGrp}</div>
                        <div style={{ fontSize: "20px", fontWeight: 900, color: "#1F2937", marginTop: "4px" }}>{patient?.blood_group || "—"}</div>
                      </div>
                    </div>

                    <div style={{ background: "#F4FAF4", border: "1px solid rgba(46, 125, 50, 0.15)", borderRadius: "20px", padding: "20px", display: "flex", alignItems: "center", gap: "16px", marginBottom: "32px" }}>
                      <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#EAF3EA", display: "flex", alignItems: "center", justifyContent: "center", color: "#2E7D32" }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                        </svg>
                      </div>
                      <div>
                        <div style={{ fontSize: "11px", fontWeight: "bold", color: "#2E7D32" }}>CONTACT NUMBER</div>
                        <div style={{ fontSize: "16px", fontWeight: 700, color: "#1F2937" }}>{patient?.contact || "—"}</div>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "20px" }}>
                      <div>
                        <h3 style={{ fontSize: "16px", fontWeight: 800, marginBottom: "12px", color: "#1F2937" }}>{t.keyConditions}</h3>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                          {history?.summary?.keyConditions && Array.isArray(history.summary.keyConditions) ? (
                            history.summary.keyConditions.map((c: string, i: number) => (
                              <div key={i} style={{ padding: "8px 16px", background: i === 0 ? "#FEE2E2" : "#E0E7FF", color: i === 0 ? "#EF4444" : "#4F46E5", borderRadius: "100px", fontSize: "13px", fontWeight: 700 }}>
                                {c}
                              </div>
                            ))
                          ) : (
                            <div style={{ padding: "8px 16px", background: "#F3F4F6", color: "#6B7280", borderRadius: "100px", fontSize: "13px", fontWeight: 600 }}>
                              {t.assessmentPending}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "Current Script" && (
                  <div className={styles.tabContent} style={{ padding: 0 }}>
                    {/* Redesigned minimal prescription display inside the card */}
                    <div style={{ borderBottom: "2px solid #2E7D32", paddingBottom: "20px", marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 900, color: "#1F2937" }}>{clinic?.name || "Clinic Prescription"}</h2>
                        <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#6B7280", fontWeight: 500 }}>{clinic?.tagline || "Healthcare Facility"}</p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#2E7D32" }}>{rx.doctor_name}</h3>
                        <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: "#6B7280", fontWeight: 500 }}>Lic: {rx.doctor_id?.slice(0, 8).toUpperCase() || "MED-N-A"}</p>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "32px" }}>
                      <div>
                        {rx.complaints && (
                          <div style={{ marginBottom: "20px" }}>
                            <h4 style={{ fontSize: "12px", fontWeight: "bold", color: "#9CA3AF", textTransform: "uppercase", margin: "0 0 6px 0" }}>{t.cc}</h4>
                            <p style={{ margin: 0, fontSize: "14px", color: "#374151", lineHeight: 1.5 }}>{rx.complaints}</p>
                          </div>
                        )}
                        {rx.findings && (
                          <div style={{ marginBottom: "20px" }}>
                            <h4 style={{ fontSize: "12px", fontWeight: "bold", color: "#9CA3AF", textTransform: "uppercase", margin: "0 0 6px 0" }}>{t.findings}</h4>
                            <p style={{ margin: 0, fontSize: "14px", color: "#374151", lineHeight: 1.5 }}>{rx.findings}</p>
                          </div>
                        )}
                        {rx.diagnosis && (
                          <div style={{ background: "#F4FAF4", padding: "16px", borderRadius: "12px", borderLeft: "4px solid #2E7D32" }}>
                            <h4 style={{ fontSize: "11px", fontWeight: "bold", color: "#2E7D32", textTransform: "uppercase", margin: "0 0 4px 0" }}>{t.diagnosis}</h4>
                            <p style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#1F2937" }}>{rx.diagnosis}</p>
                          </div>
                        )}
                      </div>

                      <div style={{ borderLeft: "1px solid #E5E7EB", paddingLeft: "32px" }}>
                        <div style={{ fontSize: "28px", fontWeight: "bold", color: "#2E7D32", fontFamily: "Georgia, serif", fontStyle: "italic", marginBottom: "16px", opacity: 0.8 }}>Rx</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                          {meds && meds.length > 0 ? (
                            meds.map((m: any, idx: number) => (
                              <div key={idx} style={{ fontSize: "14px", borderBottom: "1px solid #F3F4F6", paddingBottom: "10px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, color: "#1F2937" }}>
                                  <span>{idx + 1}. {m.type} {m.name}</span>
                                  <span>{m.dose}</span>
                                </div>
                                <div style={{ fontSize: "12px", color: "#6B7280", marginTop: "2px" }}>
                                  {m.freq} • {m.dur || m.duration} • {m.inst || m.instructions}
                                </div>
                                {m.note && (
                                  <div style={{ fontSize: "11px", color: "#9CA3AF", fontStyle: "italic", marginTop: "4px" }}>
                                    * {m.note}
                                  </div>
                                )}
                              </div>
                            ))
                          ) : (
                            <p style={{ margin: 0, color: "#9CA3AF", fontSize: "13px" }}>{t.noMedicines}</p>
                          )}
                        </div>

                        {rx.advice && (
                          <div style={{ marginTop: "24px", background: "#FAFDFB", padding: "14px", borderRadius: "10px", border: "1px solid #E2E8F0" }}>
                            <h4 style={{ fontSize: "11px", fontWeight: "bold", color: "#6B7280", textTransform: "uppercase", margin: "0 0 6px 0" }}>{t.adv}</h4>
                            <p style={{ margin: 0, fontSize: "13px", color: "#4B5563", lineHeight: 1.5 }}>{rx.advice}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "40px", paddingTop: "20px", borderTop: "1px solid #E5E7EB", fontSize: "11px", color: "#9CA3AF", fontWeight: 500 }}>
                      <div>{clinic?.address || "Clinical Facility Address"} • Ph: {clinic?.phone}</div>
                      <div>Digital Clinical Record</div>
                    </div>

                    {/* Page 2 Guidance Sheet for Mobile */}
                    {rx?.guidance_sheet && (
                      <div className={styles.guidanceCard} id="guidance-sheet-view-mobile">
                        {/* 1. Header */}
                        <div className={styles.guidanceHeader}>
                          <div className={styles.headerColumn || ""}>
                            <div className={styles.drName || ""} style={{ fontSize: "26px", fontWeight: 900, color: "#0d6e56" }}>
                              Dr. {(rx.doctor_name || "Consultant").replace(/^(Dr\.\s*|Dr\s+)/i, "")}
                            </div>
                            <div className={styles.drSmall || ""} style={{ fontSize: "11px", color: "#64748b" }}>
                              Physician
                            </div>
                          </div>
                          <div className={styles.headerLogo || ""} style={{ width: "80px", display: "flex", justifyContent: "center" }}>
                            <div className={styles.logoCircle || ""} style={{ width: "62px", height: "62px", border: "3px solid #0d6e56", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#0d6e56" }}>
                              <svg viewBox="0 0 24 24" fill="currentColor" width="28">
                                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                              </svg>
                            </div>
                          </div>
                          <div className={styles.headerColumn || ""} style={{ textAlign: "right" }}>
                            <div className={styles.hospName || ""} style={{ fontSize: "22px", fontWeight: 900, color: "#0d6e56" }}>
                              {clinic?.name || hospitalName}
                            </div>
                            <div className={styles.hospSlogan || ""} style={{ fontSize: "13px", color: "#64748b" }}>
                              {clinic?.tagline || "Advanced Clinical Care"}
                            </div>
                          </div>
                        </div>

                        <div className={styles.guidanceTitleArea}>
                          <div className={styles.guidanceBadge}>Patient Guidance Sheet</div>
                          <div className={styles.guidanceSubtitle}>Custom Care Plan & Advice</div>
                        </div>

                        {/* 2. 2-column Grid */}
                        <div className={styles.guidanceGrid}>
                          {/* Section 1: Understanding Condition */}
                          {rx.guidance_sheet.understanding_condition?.points?.length > 0 && (
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
                              {rx.guidance_sheet.understanding_condition.disease_name && (
                                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}>
                                  {rx.guidance_sheet.understanding_condition.disease_name}
                                </div>
                              )}
                              <ul className={styles.guidancePointsList}>
                                {(rx.guidance_sheet.understanding_condition.points || []).map((pt: string, idx: number) => (
                                  <li key={idx} className={styles.guidancePointItem}>{pt}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Section 2: Diet & Nutrition */}
                          {rx.guidance_sheet.diet_nutrition?.points?.length > 0 && (
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
                                {(rx.guidance_sheet.diet_nutrition.points || []).map((pt: string, idx: number) => (
                                  <li key={idx} className={styles.guidancePointItem}>{pt}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Section 3: Water & Hydration */}
                          {rx.guidance_sheet.hydration?.points?.length > 0 && (
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
                                {(rx.guidance_sheet.hydration.points || []).map((pt: string, idx: number) => (
                                  <li key={idx} className={styles.guidancePointItem}>{pt}</li>
                                ))}
                              </ul>
                              {rx.guidance_sheet.hydration.tip && (
                                <div className={styles.guidanceCallout}>
                                  <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h-3V9h5v8z" />
                                  </svg>
                                  <span>{rx.guidance_sheet.hydration.tip}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Section 4: Activity & Exercise */}
                          {rx.guidance_sheet.activity_exercise?.points?.length > 0 && (
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
                                {(rx.guidance_sheet.activity_exercise.points || []).map((pt: string, idx: number) => (
                                  <li key={idx} className={styles.guidancePointItem}>{pt}</li>
                                ))}
                              </ul>
                              {rx.guidance_sheet.activity_exercise.tip && (
                                <div className={styles.guidanceCallout}>
                                  <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h-3V9h5v8z" />
                                  </svg>
                                  <span>{rx.guidance_sheet.activity_exercise.tip}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Section 5: Things To Avoid */}
                          {rx.guidance_sheet.things_to_avoid?.items?.length > 0 && (
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
                                {(rx.guidance_sheet.things_to_avoid.items || []).map((item: any, idx: number) => (
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

                          {/* Section 6: Warning Signs & Follow-up */}
                          {(rx.guidance_sheet.warning_signs?.red_flags?.length > 0 || rx.guidance_sheet.warning_signs?.follow_up) && (
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
                              {rx.guidance_sheet.warning_signs.red_flags?.length > 0 && (
                                <ul className={styles.guidancePointsList} style={{ marginBottom: '12px' }}>
                                  {(rx.guidance_sheet.warning_signs.red_flags || []).map((pt: string, idx: number) => (
                                    <li key={idx} className={styles.guidanceRedFlagItem}>{pt}</li>
                                  ))}
                                </ul>
                              )}
                              {rx.guidance_sheet.warning_signs.follow_up && (
                                <div className={styles.guidanceCallout} style={{ background: '#fff5f5', borderColor: '#ef4444', color: '#b91c1c' }}>
                                  <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h-3V9h5v8z" />
                                  </svg>
                                  <span>{rx.guidance_sheet.warning_signs.follow_up}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* 3. General Care Tips Footer */}
                        {rx.guidance_sheet.general_tips?.length > 0 && (
                          <div className={styles.guidanceFooter}>
                            <div className={styles.guidanceFooterTips}>
                              {(rx.guidance_sheet.general_tips || []).slice(0, 3).map((tip: string, idx: number) => (
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
                )}

                {activeTab === "AI Summary" && (
                  <div className={styles.tabContent}>
                    {activeSummary ? (
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                          <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 900, color: "#1F2937" }}>{activeSummary?.greeting || "Your Clinical Guide"}</h2>
                          <button
                            onClick={handleToggleSpeech}
                            style={{ display: "flex", alignItems: "center", gap: "6px", background: "linear-gradient(135deg, #2E7D32 0%, #1B5E20 100%)", color: "white", border: "none", padding: "8px 16px", borderRadius: "100px", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              {isSpeaking ? (
                                <>
                                  <rect x="6" y="4" width="4" height="16"></rect>
                                  <rect x="14" y="4" width="4" height="16"></rect>
                                </>
                              ) : (
                                <>
                                  <path d="M11 5L6 9H2v6h4l5 4V5z"></path>
                                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                                </>
                              )}
                            </svg>
                            <span>{isSpeaking ? t.stopListen : t.listenSummary}</span>
                          </button>
                        </div>

                        <div style={{ background: "#F4FAF4", border: "1px solid rgba(46, 125, 50, 0.15)", padding: "20px", borderRadius: "20px", marginBottom: "24px" }}>
                          <h3 style={{ margin: "0 0 8px 0", fontSize: "15px", fontWeight: 800, color: "#2E7D32" }}>{t.condition}</h3>
                          <p style={{ margin: 0, fontSize: "14px", color: "#374151", lineHeight: 1.6 }}>{activeSummary?.condition}</p>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                            <div style={{ border: "1px solid #E5E7EB", borderRadius: "20px", padding: "20px" }}>
                              <h3 style={{ margin: "0 0 16px 0", fontSize: "15px", fontWeight: 800, color: "#1F2937" }}>💊 {t.medicines}</h3>
                              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                {activeSummary?.medicines?.map((m: any, i: number) => (
                                  <div key={i} style={{ borderBottom: "1px solid #F3F4F6", paddingBottom: "10px" }}>
                                    <div style={{ fontWeight: 700, color: "#1F2937", fontSize: "14px" }}>{m.name}</div>
                                    <div style={{ fontSize: "12px", color: "#6B7280", marginTop: "2px" }}>{m.purpose}</div>
                                    {m.dosage && (
                                      <div style={{ display: "inline-block", padding: "2px 8px", background: "#EAF3EA", color: "#2E7D32", borderRadius: "4px", fontSize: "11px", fontWeight: 700, marginTop: "6px" }}>
                                        {m.dosage}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div style={{ border: "1px solid #E5E7EB", borderRadius: "20px", padding: "20px" }}>
                              <h3 style={{ margin: "0 0 12px 0", fontSize: "15px", fontWeight: 800, color: "#1F2937" }}>🥗 {t.care}</h3>
                              <p style={{ margin: 0, fontSize: "13px", color: "#4B5563", lineHeight: 1.6 }}>{activeSummary?.care}</p>
                            </div>
                          </div>

                          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                            <div style={{ border: "1px solid #E5E7EB", borderRadius: "20px", padding: "20px" }}>
                              <h3 style={{ margin: "0 0 12px 0", fontSize: "15px", fontWeight: 800, color: "#1F2937" }}>⏳ {t.expectations}</h3>
                              <p style={{ margin: 0, fontSize: "13px", color: "#4B5563", lineHeight: 1.6 }}>{activeSummary?.expectations}</p>
                            </div>

                            <div style={{ border: "1px solid #FEE2E2", background: "#FFF5F5", borderRadius: "20px", padding: "20px" }}>
                              <h3 style={{ margin: "0 0 12px 0", fontSize: "15px", fontWeight: 800, color: "#EF4444" }}>⚠️ {t.warnings}</h3>
                              {Array.isArray(activeSummary?.warnings) ? (
                                <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "13px", color: "#B91C1C", lineHeight: 1.6 }}>
                                  {activeSummary.warnings.map((w: string, i: number) => (
                                    <li key={i}>{w}</li>
                                  ))}
                                </ul>
                              ) : (
                                <p style={{ margin: 0, fontSize: "13px", color: "#B91C1C", lineHeight: 1.6 }}>{activeSummary?.warnings || "No specific warnings."}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ textAlign: "center", padding: "40px" }}>
                        <div className="spinner" style={{ width: "40px", height: "40px", borderTopColor: "#2E7D32", margin: "0 auto 16px auto" }} />
                        <p style={{ color: "#6B7280", fontWeight: 600 }}>{t.aiPreparing}</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "Care Guidance" && rx?.guidance_sheet && (
                  <div className={styles.tabContent}>
                    <div className={styles.dgWrapper}>
                      {/* Header */}
                      <div className={styles.dgHeader}>
                        <div className={styles.dgHeaderIcon}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" />
                            <path d="M12 7v10" />
                            <path d="M8 11h8" />
                          </svg>
                        </div>
                        <div className={styles.dgHeaderText}>
                          <h2>Personalized Care Plan & Advice</h2>
                          <p>AI-generated care guidance tailored to your condition, approved by Dr. {(rx.doctor_name || "Consulting Physician").replace(/^(Dr\.\s*|Dr\s+)/i, "")}</p>
                        </div>
                      </div>

                      {/* 6 Core Components Grid */}
                      <div className={styles.dgGrid}>
                        
                        {/* 1. Understanding Condition */}
                        {rx.guidance_sheet.understanding_condition && (rx.guidance_sheet.understanding_condition.disease_name || rx.guidance_sheet.understanding_condition.points?.length > 0) && (
                          <div className={`${styles.dgCard} ${styles.dgCardCondition}`}>
                            <div className={styles.dgCardHeader}>
                              <div className={styles.dgCardIcon}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <circle cx="12" cy="12" r="10" />
                                  <path d="M12 16v-4" />
                                  <path d="M12 8h.01" />
                                </svg>
                              </div>
                              <span className={styles.dgCardTitle}>Understanding Condition</span>
                            </div>
                            {rx.guidance_sheet.understanding_condition.disease_name && (
                              <div className={styles.dgConditionName}>
                                {rx.guidance_sheet.understanding_condition.disease_name}
                              </div>
                            )}
                            <ul className={styles.dgPointsList}>
                              {(rx.guidance_sheet.understanding_condition.points || []).map((pt: string, idx: number) => (
                                <li key={idx} className={styles.dgPointItem}>{pt}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* 2. Diet & Nutrition */}
                        {rx.guidance_sheet.diet_nutrition && rx.guidance_sheet.diet_nutrition.points?.length > 0 && (
                          <div className={`${styles.dgCard} ${styles.dgCardDiet}`}>
                            <div className={styles.dgCardHeader}>
                              <div className={styles.dgCardIcon}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                                </svg>
                              </div>
                              <span className={styles.dgCardTitle}>Diet & Nutrition</span>
                            </div>
                            <ul className={styles.dgPointsList}>
                              {(rx.guidance_sheet.diet_nutrition.points || []).map((pt: string, idx: number) => (
                                <li key={idx} className={styles.dgPointItem}>{pt}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* 3. Hydration */}
                        {rx.guidance_sheet.hydration && (rx.guidance_sheet.hydration.points?.length > 0 || rx.guidance_sheet.hydration.tip) && (
                          <div className={`${styles.dgCard} ${styles.dgCardHydration}`}>
                            <div className={styles.dgCardHeader}>
                              <div className={styles.dgCardIcon}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <path d="M12 22a7 7 0 0 0 7-7c0-4.3-7-11-7-11S5 10.7 5 15a7 7 0 0 0 7 7z" />
                                </svg>
                              </div>
                              <span className={styles.dgCardTitle}>Water & Hydration</span>
                            </div>
                            <ul className={styles.dgPointsList}>
                              {(rx.guidance_sheet.hydration.points || []).map((pt: string, idx: number) => (
                                <li key={idx} className={styles.dgPointItem}>{pt}</li>
                              ))}
                            </ul>
                            {rx.guidance_sheet.hydration.tip && (
                              <div className={styles.dgCallout}>
                                <span>💡</span>
                                <span>{rx.guidance_sheet.hydration.tip}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* 4. Activity & Exercise */}
                        {rx.guidance_sheet.activity_exercise && (rx.guidance_sheet.activity_exercise.points?.length > 0 || rx.guidance_sheet.activity_exercise.tip) && (
                          <div className={`${styles.dgCard} ${styles.dgCardActivity}`}>
                            <div className={styles.dgCardHeader}>
                              <div className={styles.dgCardIcon}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                                </svg>
                              </div>
                              <span className={styles.dgCardTitle}>Activity & Exercise</span>
                            </div>
                            <ul className={styles.dgPointsList}>
                              {(rx.guidance_sheet.activity_exercise.points || []).map((pt: string, idx: number) => (
                                <li key={idx} className={styles.dgPointItem}>{pt}</li>
                              ))}
                            </ul>
                            {rx.guidance_sheet.activity_exercise.tip && (
                              <div className={styles.dgCallout}>
                                <span>🏃‍♂️</span>
                                <span>{rx.guidance_sheet.activity_exercise.tip}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* 5. Things to Avoid */}
                        {rx.guidance_sheet.things_to_avoid && rx.guidance_sheet.things_to_avoid.items?.length > 0 && (
                          <div className={`${styles.dgCard} ${styles.dgCardAvoid}`}>
                            <div className={styles.dgCardHeader}>
                              <div className={styles.dgCardIcon}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <circle cx="12" cy="12" r="10" />
                                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                                </svg>
                              </div>
                              <span className={styles.dgCardTitle}>Things to Avoid</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              {(rx.guidance_sheet.things_to_avoid.items || []).map((item: any, idx: number) => (
                                <div key={idx} className={styles.dgAvoidItem}>
                                  <div className={styles.dgAvoidHeader}>
                                    <span>❌</span>
                                    <span>{item.text}</span>
                                  </div>
                                  {item.reason && <div className={styles.dgAvoidReason}>{item.reason}</div>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 6. Warning Signs */}
                        {rx.guidance_sheet.warning_signs && (rx.guidance_sheet.warning_signs.red_flags?.length > 0 || rx.guidance_sheet.warning_signs.follow_up) && (
                          <div className={`${styles.dgCard} ${styles.dgCardWarning}`}>
                            <div className={styles.dgCardHeader}>
                              <div className={styles.dgCardIcon}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                  <line x1="12" y1="9" x2="12" y2="13" />
                                  <line x1="12" y1="17" x2="12.01" y2="17" />
                                </svg>
                              </div>
                              <span className={styles.dgCardTitle}>Warning Signs</span>
                            </div>
                            <ul className={styles.dgPointsList}>
                              {(rx.guidance_sheet.warning_signs.red_flags || []).map((pt: string, idx: number) => (
                                <li key={idx} className={styles.dgRedFlagItem}>{pt}</li>
                              ))}
                            </ul>
                            {rx.guidance_sheet.warning_signs.follow_up && (
                              <div className={styles.dgCallout}>
                                <span>🚨</span>
                                <span><strong>Follow-up:</strong> {rx.guidance_sheet.warning_signs.follow_up}</span>
                              </div>
                            )}
                          </div>
                        )}

                      </div>

                      {/* General Tips Banner */}
                      {rx.guidance_sheet.general_tips && rx.guidance_sheet.general_tips.length > 0 && (
                        <div className={styles.dgGeneralTipsBanner}>
                          <div className={styles.dgGeneralTipsTitle}>
                            <span>🛡️</span> General Health Tips & Wellness Guidelines
                          </div>
                          <div className={styles.dgGeneralTipsGrid}>
                            {rx.guidance_sheet.general_tips.map((tip: string, idx: number) => (
                              <div key={idx} className={styles.dgGeneralTipItem}>
                                <span className={styles.dgGeneralTipIcon}>✨</span>
                                <div>{tip}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === "Patient History" && (
                  <div className={styles.tabContent}>
                    <h2 style={{ fontSize: "20px", fontWeight: 900, marginBottom: "20px" }}>{t.history}</h2>
                    {loadingHistory ? (
                      <div style={{ textAlign: "center", padding: "20px" }}>
                        <div className="spinner" style={{ width: "32px", height: "32px", borderTopColor: "#2E7D32", margin: "0 auto 12px auto" }} />
                        <p style={{ color: "#6B7280" }}>{t.retrieving}</p>
                      </div>
                    ) : history?.visits && history.visits.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        {history.visits.map((visit: any, index: number) => (
                          <div key={index} style={{ border: "1px solid #E5E7EB", borderRadius: "16px", padding: "16px", background: "#FAFDFB" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                              <span style={{ fontSize: "12px", fontWeight: "bold", background: "#EAF3EA", color: "#2E7D32", padding: "4px 10px", borderRadius: "6px" }}>{t.consultation}</span>
                              <span style={{ fontSize: "12px", color: "#9CA3AF" }}>{new Date(visit.visit_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                            </div>
                            <div style={{ fontSize: "14px", color: "#374151", marginBottom: "8px" }}>
                              <strong>Doctor:</strong> {visit.doctor}
                            </div>
                            <div style={{ fontSize: "13px", color: "#4B5563" }}>
                              <strong>Chief Complaints:</strong> {visit.complaints || "—"}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ textAlign: "center", padding: "30px", background: "#F9FAFB", borderRadius: "16px" }}>
                        <h4 style={{ margin: 0, color: "#6B7280" }}>{t.noPastVisits}</h4>
                        <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#9CA3AF" }}>{t.firstVisit}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Trust badges footer */}
              <div className={styles.trustGridContainer} style={{ marginTop: "40px", maxWidth: "800px", width: "100%", boxSizing: "border-box" }}>
                <div className={styles.trustItem}>
                  <div className={styles.trustIconWrap}><ShieldCheck size={24} className={styles.trustIcon} /></div>
                  <div className={styles.trustTextWrap}>
                    <h4>Secure Records</h4>
                    <p>Protected by end-to-end encryption</p>
                  </div>
                </div>
                <div className={styles.trustItemDivider} />
                <div className={styles.trustItem}>
                  <div className={styles.trustIconWrap}><Lock size={20} className={styles.trustIcon} /></div>
                  <div className={styles.trustTextWrap}>
                    <h4>HIPAA Compliant</h4>
                    <p>Standard patient privacy protocols</p>
                  </div>
                </div>
                <div className={styles.trustItemDivider} />
                <div className={styles.trustItem}>
                  <div className={styles.trustIconWrap}><Headphones size={22} className={styles.trustIcon} /></div>
                  <div className={styles.trustTextWrap}>
                    <h4>Direct Care</h4>
                    <p>Instantly contact your practitioner</p>
                  </div>
                </div>
              </div>

              {/* Bottom Copyright */}
              <p style={{ fontSize: "11px", color: "#9CA3AF", textAlign: "center", marginTop: "32px", marginBottom: "40px" }}>
                © {new Date().getFullYear()} MedieNest. All rights reserved. Powered by secure clinical AI.
              </p>
            </>
          )}
        </div>

        {/* --- LANGUAGE SELECTION MODAL --- */}
        {showLangModal && (
          <div className={styles.modalOverlay}>
            <div className={styles.langModal}>
              <h2>Select Language</h2>
              <p>Choose your preferred language for the AI clinical guide.</p>
              <div className={styles.langGrid}>
                {languages.map((l) => (
                  <div
                    key={l.name}
                    className={styles.langCard}
                    onClick={() => handleLangSelect(l.name)}
                  >
                    <div className={styles.langIcon}>{l.icon}</div>
                    <div className={styles.langName}>{l.name}</div>
                    <div className={styles.langSub}>{l.sub}</div>
                  </div>
                ))}
              </div>
              <button
                style={{
                  marginTop: 24,
                  background: "none",
                  border: "none",
                  color: "var(--text-soft)",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
                onClick={() => setShowLangModal(false)}
              >
                Continue in English
              </button>
            </div>
          </div>
        )}
        {id === "ae1163db-5002-4341-9cfe-535860ce2593" && (
          <DemoViewTour activeTab={activeTab} setActiveTab={setActiveTab} />
        )}
      </div>
    );
  }

  return (
    <>
      <nav className={styles.topNav}>
        <div className={styles.navLeft}>
          <div className={styles.brand}>MedieNest</div>
        </div>
        <div
          className={`${styles.navCenter} ${activeTab === "AI Summary" ? styles.navCenterCentered : ""}`}
        >
          <div className={styles.breadcrumb}>
            <span className={styles.breadcrumbActive}>
              {activeTab === "Patient Profile"
                ? t.profile
                : activeTab === "Current Script"
                  ? t.script
                  : activeTab === "AI Summary"
                    ? t.summary
                    : activeTab === "Patient History"
                      ? t.history
                      : activeTab === "Care Guidance"
                        ? t.guidance
                        : activeTab}
            </span>
          </div>

          {(activeTab === "Patient Profile" ||
            activeTab === "Current Script" ||
            activeTab === "Patient History") && (
            <div className={styles.contextNav}>
              {activeTab === "Patient Profile" && (
                <>
                  <a href="#biometrics" className={styles.contextNavLink}>
                    {t.vitalBiometrics}
                  </a>
                  <a href="#meds" className={styles.contextNavLink}>
                    {t.maintenanceMeds}
                  </a>
                  <button
                    onClick={() => setActiveTab("Patient History")}
                    className={styles.contextNavLink}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    {t.history}
                  </button>
                </>
              )}
              {activeTab === "Current Script" && (
                <>
                  <a
                    href="#"
                    className={styles.contextNavLink}
                    onClick={(e) => {
                      e.preventDefault();
                      window.print();
                    }}
                  >
                    {t.printRecord}
                  </a>
                  <a href="#" className={styles.contextNavLink}>
                    {t.digitalCopy}
                  </a>
                </>
              )}
              {activeTab === "Patient History" && (
                <>
                  <a href="#history" className={styles.contextNavLink}>
                    {t.timelineView}
                  </a>
                </>
              )}
            </div>
          )}
        </div>
        <div className={styles.navRight}>
          <button
            className={styles.navIconBtn}
            onClick={() => alert("No new notifications")}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </button>
          <button
            className={styles.navIconBtn}
            onClick={() => setShowLangModal(true)}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>

          <button
            onClick={() => setShowDocProfile(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "#4f46e5",
              color: "white",
              border: "none",
              padding: "6px 16px 6px 8px",
              borderRadius: 100,
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 13,
              marginLeft: 8,
              transition: "opacity 0.2s",
            }}
            title={t.doctorInfo}
          >
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                background: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              {(doctor?.name || rx?.doctor_name || "D")?.[0]?.toUpperCase() ||
                "D"}
            </span>
            {t.doctorInfo}
          </button>
        </div>
      </nav>

      {!user && mounted && (
        <div className={styles.horizontalNav}>
          {sidebarItems.map((item) => (
            <button
              key={item.name}
              className={`${styles.horizontalNavItem} ${activeTab === item.name ? styles.horizontalNavItemActive : ""}`}
              onClick={() => setActiveTab(item.name as any)}
            >
              <span className={styles.sideIcon}>{item.icon}</span>
              <span className={styles.sideLabel}>
                {item.name === "Patient Profile"
                  ? t.profile
                  : item.name === "Current Script"
                    ? t.script
                    : item.name === "AI Summary"
                      ? t.summary
                      : item.name === "Patient History"
                        ? t.history
                        : item.name === "Care Guidance"
                          ? t.guidance
                          : item.name}
              </span>
            </button>
          ))}
        </div>
      )}

      <div
        className={`${styles.layoutWrapper} ${!user ? styles.layoutWrapperPatient : ""}`}
      >
        {user && (
          <aside className={styles.sidebar}>
            <div className={styles.sidebarTop}>
              <h2 className={styles.clinicName}>Clinical Hub</h2>
              <p className={styles.clinicSub}>{hospitalName}</p>

              <div className={styles.sidebarNav}>
                {sidebarItems.map((item) => (
                  <button
                    key={item.name}
                    className={`${styles.sidebarItem} ${activeTab === item.name ? styles.sidebarItemActive : ""}`}
                    onClick={() => setActiveTab(item.name as any)}
                  >
                    <span className={styles.sideIcon}>{item.icon}</span>
                    <span className={styles.sideLabel}>{item.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div
              className={styles.sidebarFooter}
              style={{ border: "none", padding: 0, margin: 0 }}
            >
              {/* Sidebar footer content removed as per request */}
            </div>
          </aside>
        )}

        <main className={styles.mainScroll}>
          <div className={styles.container}>
            {loading ? (
              <div className={styles.loadingContainer}>
                <div className={styles.loader}></div>
                <p>{t.loadingRecords}</p>
              </div>
            ) : error || !rx ? (
              <div className={styles.errorContainer}>
                <h1>{t.oops}</h1>
                <p>{error || t.accessDenied}</p>
                <button onClick={() => window.location.reload()}>
                  {t.retry}
                </button>
              </div>
            ) : (
              <>
                <header className={styles.pageHeader}>
                  <div className={styles.clinicDetails}>
                    <div className={styles.clinicNameFinal}>{hospitalName}</div>
                    <div className={styles.doctorNameTop}>
                      {t.by} {rx?.doctor_name || "Consulting Physician"}
                    </div>
                    <div className={styles.clinicSubFinal}>
                      {user
                        ? clinic?.tagline || "Advanced Clinical Hub"
                        : t.clinicalRecord}
                    </div>
                  </div>
                  <div className={styles.headerActions}>
                    <button
                      className={styles.headerBtn + " " + styles.outlineBtn}
                      onClick={() => window.print()}
                    >
                      {t.exportPdf}
                    </button>
                  </div>
                </header>

                {activeTab === "Patient Profile" && (
                  <div className={styles.profileGrid}>
                    <div className={styles.gridContent}>
                      <header className={styles.patientHero}>
                        <div className={styles.heroAvatar}>
                          {patient?.name?.[0].toUpperCase()}
                        </div>
                        <div className={styles.heroInfo}>
                          <div className={styles.heroBadge}>
                            {t.verifiedPatient}
                          </div>
                          <h1 className={styles.heroName}>{patient?.name}</h1>
                          <div
                            style={{
                              display: "flex",
                              gap: 16,
                              fontSize: 13,
                              fontWeight: 650,
                              color: "var(--text-soft)",
                            }}
                          >
                            <span>
                              {patient?.age} {t.yrs}
                            </span>
                            <span>•</span>
                            <span>{patient?.gender}</span>
                            <span>•</span>
                            <span>
                              {t.patientID}:{" "}
                              {rx.patient_id.slice(0, 8).toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </header>

                      <section id="biometrics" className={styles.vitalCard}>
                        <div className={styles.vitalHeader}>
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          >
                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                          </svg>
                          {t.vitalBiometrics}
                        </div>
                        <div className={styles.vitalGrid}>
                          <div className={styles.vitalCircle}>
                            <span className={styles.vitalLabel}>{t.age}</span>
                            <span className={styles.vitalValue}>
                              {patient?.age || "—"}
                            </span>
                          </div>
                          <div className={styles.vitalCircle}>
                            <span className={styles.vitalLabel}>{t.sex}</span>
                            <span className={styles.vitalValue}>
                              {patient?.gender || "—"}
                            </span>
                          </div>
                          <div className={styles.vitalCircle}>
                            <span className={styles.vitalLabel}>
                              {t.weight}
                            </span>
                            <span className={styles.vitalValue}>
                              {rx.weight ? `${rx.weight} Kg` : "—"}
                            </span>
                          </div>
                          <div className={styles.vitalCircle}>
                            <span className={styles.vitalLabel}>
                              {t.height}
                            </span>
                            <span className={styles.vitalValue}>—</span>
                          </div>
                        </div>
                        <div className={styles.contactBanner}>
                          <div className={styles.contactItem}>
                            <div className={styles.contactIcon}>
                              <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                              >
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                              </svg>
                            </div>
                            <span>{patient?.contact || "—"}</span>
                          </div>
                        </div>
                      </section>

                      <section className={styles.conditionsCard}>
                        <div className={styles.condHeader}>
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          >
                            <path d="M11 2a2 2 0 0 0-2 2v5H4a2 2 0 0 0-2 2v2c0 1.1.9 2 2 2h5v5c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2v-5h5a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-5V4a2 2 0 0 0-2-2h-2z" />
                          </svg>
                          {t.keyConditions}
                        </div>
                        <div className={styles.tagsRow}>
                          {history?.summary?.keyConditions &&
                          Array.isArray(history.summary.keyConditions) ? (
                            history.summary.keyConditions.map(
                              (c: string, i: number) => (
                                <div
                                  key={i}
                                  className={`${styles.tag} ${i === 0 ? styles.tagAlert : styles.tagNormal}`}
                                >
                                  {i === 0 && <span className={styles.dot} />}{" "}
                                  {c}
                                </div>
                              ),
                            )
                          ) : (
                            <div
                              className={`${styles.tag} ${styles.tagNormal}`}
                            >
                              {t.assessmentPending}
                            </div>
                          )}
                        </div>
                      </section>

                      <section id="meds" className={styles.medsSection}>
                        <div className={styles.medsHeader}>
                          <h3 style={{ margin: 0, fontWeight: 900 }}>
                            {t.maintenanceMeds}
                          </h3>
                          <button
                            onClick={() => setActiveTab("Patient History")}
                            className={styles.viewHistory}
                            style={{
                              background: "none",
                              border: "none",
                              padding: 0,
                              cursor: "pointer",
                            }}
                          >
                            {t.viewHistory}
                          </button>
                        </div>
                        <div className={styles.medsGrid}>
                          {history?.summary?.currentMedications &&
                          Array.isArray(history.summary.currentMedications) &&
                          history.summary.currentMedications.length > 0 ? (
                            history.summary.currentMedications
                              .slice(0, 3)
                              .map((m: any, i: number) => (
                                <div key={i} className={styles.medCard}>
                                  <div className={styles.medIconBox}>
                                    {typeof m === "object" &&
                                    (m.name?.toLowerCase().includes("iv") ||
                                      m.name?.toLowerCase().includes("ors")) ? (
                                      <svg
                                        width="24"
                                        height="24"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="#6366f1"
                                        strokeWidth="2.5"
                                      >
                                        <path d="M10 2v8" />
                                        <path d="M14 2v8" />
                                        <path d="M8 10h8v10a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V10Z" />
                                        <path d="M8 14h8" />
                                      </svg>
                                    ) : (
                                      <svg
                                        width="24"
                                        height="24"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="#6366f1"
                                        strokeWidth="2.5"
                                      >
                                        <circle cx="7" cy="7" r="5" />
                                        <circle cx="17" cy="17" r="5" />
                                        <path d="M12 2v20" />
                                        <path d="M2 12h20" />
                                      </svg>
                                    )}
                                  </div>
                                  <div className={styles.medInfo}>
                                    <h4>
                                      {typeof m === "object" ? m.name : m}
                                    </h4>
                                    <div className={styles.medInstruction}>
                                      {t.dosage}
                                    </div>
                                  </div>
                                </div>
                              ))
                          ) : (
                            <div
                              className={styles.emptyPrompt}
                              style={{
                                padding: 20,
                                textAlign: "center",
                                background: "#f8fafc",
                                borderRadius: 12,
                                border: "1px dashed #e2e8f0",
                              }}
                            >
                              <p
                                style={{
                                  margin: 0,
                                  fontSize: 13,
                                  color: "var(--text-soft)",
                                }}
                              >
                                {t.noMeds}
                              </p>
                            </div>
                          )}
                        </div>
                      </section>
                    </div>

                    <div className={styles.gridSidebar}>
                      <aside className={styles.intelCard}>
                        <div className={styles.intelHeader}>
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          >
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                          </svg>
                          {t.clinicalSnapshot}
                        </div>
                        <div className={styles.intelBody}>
                          <p>
                            {history?.summary?.recentVisitsSummary ||
                              t.noSnapshot}
                          </p>
                        </div>
                      </aside>

                      <section className={styles.demoCard}>
                        <h3>{t.quickDemo}</h3>
                        <div className={styles.demoRow}>
                          <span className={styles.demoLabel}>
                            {t.patientID}
                          </span>
                          <span className={styles.demoVal}>
                            #{rx.patient_id.slice(0, 5).toUpperCase()}-ALPHA
                          </span>
                        </div>
                        <div className={styles.demoRow}>
                          <span className={styles.demoLabel}>{t.regDate}</span>
                          <span className={styles.demoVal}>
                            {new Date(
                              patient?.created_at || "",
                            ).toLocaleDateString("en-IN", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                        <div className={styles.demoRow}>
                          <span className={styles.demoLabel}>{t.prefLang}</span>
                          <span className={styles.demoVal}>{selectedLang}</span>
                        </div>
                        <div className={styles.demoRow}>
                          <span className={styles.demoLabel}>
                            {t.resStatus}
                          </span>
                          <span className={styles.demoVal}>{t.permanent}</span>
                        </div>
                      </section>
                    </div>
                  </div>
                )}

                {activeTab === "Current Script" && (
                  <div className={styles.paperWrapper}>
                    <div className={styles.paper}>
                      <header className={styles.clinicHeader}>
                        <div className={styles.clinicInfo}>
                          <h1 className={styles.clinicName}>
                            {clinic?.name || "MedieNest Clinic"}
                          </h1>
                          <p className={styles.tagline}>
                            {clinic?.tagline || "Advanced Healthcare Solutions"}
                          </p>
                          <div className={styles.clinicContact}>
                            <svg
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              width="16"
                            >
                              <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                            </svg>
                            <span>{clinic?.phone || "+91 000 000 0000"}</span>
                          </div>
                        </div>
                        <div className={styles.headerLogo}>
                          <div className={styles.logoCircle}>
                            <svg
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              width="32"
                            >
                              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                            </svg>
                          </div>
                        </div>
                        <div className={styles.doctorInfo}>
                          <h2 className={styles.drName}>
                            {rx.doctor_name || "Dr. Consultant"}
                          </h2>
                          <p className={styles.drQual}>
                            Reg No:{" "}
                            {rx.doctor_id?.slice(0, 8).toUpperCase() ||
                              "MED-0982-X"}
                          </p>
                        </div>
                      </header>

                      <section className={styles.patientBar}>
                        <div className={styles.meta}>
                          <span className={styles.label}>{t.name}:</span>
                          <span className={styles.value}>
                            {patient?.name || "Valued Patient"}
                          </span>
                        </div>
                        <div className={styles.meta}>
                          <span className={styles.label}>{t.ageSex}:</span>
                          <span className={styles.value}>
                            {patient?.age || "—"} /{" "}
                            {patient?.gender?.[0] || "—"}
                          </span>
                        </div>
                        <div className={styles.meta}>
                          <span className={styles.label}>{t.wt}:</span>
                          <span className={styles.value}>
                            {rx.weight ? `${rx.weight} Kg` : "—"}
                          </span>
                        </div>
                        <div className={styles.meta}>
                          <span className={styles.label}>{t.bGrp}:</span>
                          <span className={styles.value}>
                            {patient?.blood_group || "—"}
                          </span>
                        </div>
                        <div className={styles.meta}>
                          <span className={styles.label}>{t.dateLabel}:</span>
                          <span className={styles.value}>
                            {new Date(rx.date).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </section>

                      <main className={styles.mainContent}>
                        <div className={styles.watermark}>Rx</div>
                        <div className={styles.dualColumn}>
                          <div className={styles.leftCol}>
                            {rx.complaints && (
                              <div className={styles.section}>
                                <h3 className={styles.sectionTitle}>{t.cc}</h3>
                                <p className={styles.text}>{rx.complaints}</p>
                              </div>
                            )}
                            {rx.findings && (
                              <div className={styles.section}>
                                <h3 className={styles.sectionTitle}>
                                  {t.findings}
                                </h3>
                                <p className={styles.text}>{rx.findings}</p>
                              </div>
                            )}
                            {rx.diagnosis && (
                              <div
                                className={styles.section}
                                style={{
                                  background: "#f8fafc",
                                  padding: "16px",
                                  borderRadius: "12px",
                                  borderLeft: "4px solid #0d6e56",
                                  marginTop: "20px",
                                }}
                              >
                                <h3
                                  className={styles.sectionTitle}
                                  style={{
                                    color: "#0d6e56",
                                    marginBottom: "8px",
                                  }}
                                >
                                  {t.diagnosis}
                                </h3>
                                <p
                                  className={styles.text}
                                  style={{ fontWeight: 800 }}
                                >
                                  {rx.diagnosis}
                                </p>
                              </div>
                            )}
                          </div>

                          <div className={styles.rightCol}>
                            <div className={styles.rxIcon}>Rx</div>
                            <div className={styles.medsListFinal}>
                              {meds && meds.length > 0 ? (
                                meds.map((m: any, idx: number) => (
                                  <div
                                    key={idx}
                                    className={styles.medItemFinal}
                                  >
                                    <div className={styles.medHeaderFinal}>
                                      <strong>
                                        {idx + 1}. {m.type} {m.name}
                                      </strong>
                                      <span>{m.dose}</span>
                                    </div>
                                    <div className={styles.medScheduleFinal}>
                                      {m.freq} — {m.dur || m.duration} —{" "}
                                      {m.inst || m.instructions}
                                    </div>
                                    {m.note && (
                                      <div className={styles.medNoteFinal}>
                                        * {m.note}
                                      </div>
                                    )}
                                  </div>
                                ))
                              ) : (
                                <p className={styles.empty}>{t.noMedicines}</p>
                              )}
                            </div>

                            {rx.advice && (
                              <div className={styles.adviceSection}>
                                <h3 className={styles.sectionTitle}>{t.adv}</h3>
                                <p className={styles.text}>{rx.advice}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </main>

                      <footer className={styles.footerFinal}>
                        <div className={styles.contactInfoFinal}>
                          <p>
                            {clinic?.address || "Clinical Facility Address"}
                          </p>
                          <p>Ph: {clinic?.phone || "Contact Number"}</p>
                        </div>
                        <div className={styles.legalFinal}>
                          {hospitalName} • {t.clinicalRecord}
                        </div>
                      </footer>
                    </div>

                    {/* Page 2 Guidance Sheet for Desktop */}
                    {rx?.guidance_sheet && (
                      <div className={styles.guidanceCard} id="guidance-sheet-view-desktop">
                        {/* 1. Header */}
                        <div className={styles.guidanceHeader}>
                          <div className={styles.headerColumn || ""}>
                            <div className={styles.drName || ""} style={{ fontSize: "26px", fontWeight: 900, color: "#0d6e56" }}>
                              Dr. {(rx.doctor_name || "Consultant").replace(/^(Dr\.\s*|Dr\s+)/i, "")}
                            </div>
                            <div className={styles.drSmall || ""} style={{ fontSize: "11px", color: "#64748b" }}>
                              Physician
                            </div>
                          </div>
                          <div className={styles.headerLogo || ""} style={{ width: "80px", display: "flex", justifyContent: "center" }}>
                            <div className={styles.logoCircle || ""} style={{ width: "62px", height: "62px", border: "3px solid #0d6e56", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#0d6e56" }}>
                              <svg viewBox="0 0 24 24" fill="currentColor" width="28">
                                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                              </svg>
                            </div>
                          </div>
                          <div className={styles.headerColumn || ""} style={{ textAlign: "right" }}>
                            <div className={styles.hospName || ""} style={{ fontSize: "22px", fontWeight: 900, color: "#0d6e56" }}>
                              {clinic?.name || hospitalName}
                            </div>
                            <div className={styles.hospSlogan || ""} style={{ fontSize: "13px", color: "#64748b" }}>
                              {clinic?.tagline || "Advanced Clinical Care"}
                            </div>
                          </div>
                        </div>

                        <div className={styles.guidanceTitleArea}>
                          <div className={styles.guidanceBadge}>Patient Guidance Sheet</div>
                          <div className={styles.guidanceSubtitle}>Custom Care Plan & Advice</div>
                        </div>

                        {/* 2. 2-column Grid */}
                        <div className={styles.guidanceGrid}>
                          {/* Section 1: Understanding Condition */}
                          {rx.guidance_sheet.understanding_condition?.points?.length > 0 && (
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
                              {rx.guidance_sheet.understanding_condition.disease_name && (
                                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}>
                                  {rx.guidance_sheet.understanding_condition.disease_name}
                                </div>
                              )}
                              <ul className={styles.guidancePointsList}>
                                {(rx.guidance_sheet.understanding_condition.points || []).map((pt: string, idx: number) => (
                                  <li key={idx} className={styles.guidancePointItem}>{pt}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Section 2: Diet & Nutrition */}
                          {rx.guidance_sheet.diet_nutrition?.points?.length > 0 && (
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
                                {(rx.guidance_sheet.diet_nutrition.points || []).map((pt: string, idx: number) => (
                                  <li key={idx} className={styles.guidancePointItem}>{pt}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Section 3: Water & Hydration */}
                          {rx.guidance_sheet.hydration?.points?.length > 0 && (
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
                                {(rx.guidance_sheet.hydration.points || []).map((pt: string, idx: number) => (
                                  <li key={idx} className={styles.guidancePointItem}>{pt}</li>
                                ))}
                              </ul>
                              {rx.guidance_sheet.hydration.tip && (
                                <div className={styles.guidanceCallout}>
                                  <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h-3V9h5v8z" />
                                  </svg>
                                  <span>{rx.guidance_sheet.hydration.tip}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Section 4: Activity & Exercise */}
                          {rx.guidance_sheet.activity_exercise?.points?.length > 0 && (
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
                                {(rx.guidance_sheet.activity_exercise.points || []).map((pt: string, idx: number) => (
                                  <li key={idx} className={styles.guidancePointItem}>{pt}</li>
                                ))}
                              </ul>
                              {rx.guidance_sheet.activity_exercise.tip && (
                                <div className={styles.guidanceCallout}>
                                  <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h-3V9h5v8z" />
                                  </svg>
                                  <span>{rx.guidance_sheet.activity_exercise.tip}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Section 5: Things To Avoid */}
                          {rx.guidance_sheet.things_to_avoid?.items?.length > 0 && (
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
                                {(rx.guidance_sheet.things_to_avoid.items || []).map((item: any, idx: number) => (
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

                          {/* Section 6: Warning Signs & Follow-up */}
                          {(rx.guidance_sheet.warning_signs?.red_flags?.length > 0 || rx.guidance_sheet.warning_signs?.follow_up) && (
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
                              {rx.guidance_sheet.warning_signs.red_flags?.length > 0 && (
                                <ul className={styles.guidancePointsList} style={{ marginBottom: '12px' }}>
                                  {(rx.guidance_sheet.warning_signs.red_flags || []).map((pt: string, idx: number) => (
                                    <li key={idx} className={styles.guidanceRedFlagItem}>{pt}</li>
                                  ))}
                                </ul>
                              )}
                              {rx.guidance_sheet.warning_signs.follow_up && (
                                <div className={styles.guidanceCallout} style={{ background: '#fff5f5', borderColor: '#ef4444', color: '#b91c1c' }}>
                                  <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h-3V9h5v8z" />
                                  </svg>
                                  <span>{rx.guidance_sheet.warning_signs.follow_up}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* 3. General Care Tips Footer */}
                        {rx.guidance_sheet.general_tips?.length > 0 && (
                          <div className={styles.guidanceFooter}>
                            <div className={styles.guidanceFooterTips}>
                              {(rx.guidance_sheet.general_tips || []).slice(0, 3).map((tip: string, idx: number) => (
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
                )}

                {activeTab === "AI Summary" && (
                  <>
                    {activeSummary ? (
                      <div className={styles.aiContainer}>
                        <div className={styles.aiHero}>
                          <div className={styles.aiHeroText}>
                            <p
                              className={styles.aiTagline}
                              style={{
                                fontSize: 13,
                                color: "#4f46e5",
                                fontWeight: 800,
                                marginBottom: 8,
                                letterSpacing: "0.05em",
                              }}
                            >
                              {t.tagline}
                            </p>
                            <h1
                              className={styles.aiGreeting}
                              style={{ marginTop: 0 }}
                            >
                              {activeSummary?.greeting || "Hello!"}
                            </h1>
                          </div>
                        </div>

                        <div className={styles.aiCardMain}>
                          <div className={styles.insightHeader}>
                            <div className={styles.insightIcon}>
                              <svg
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                width="20"
                              >
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                              </svg>
                            </div>
                            <h3>{t.condition}</h3>
                          </div>
                          <p className={styles.aiCondition}>
                            {activeSummary?.condition ||
                              "Analyzing your condition..."}
                          </p>
                        </div>

                        <div className={styles.aiGrid}>
                          <div className={styles.gridLeft}>
                            <div className={styles.medsCard}>
                              <div className={styles.cardHeader}>
                                <div className={styles.headerIcon}></div>
                                <h3>{t.medicines}</h3>
                              </div>
                              <div className={styles.medsContent}>
                                {activeSummary?.medicines?.map(
                                  (m: any, i: number) => (
                                    <div key={i} className={styles.medItemAI}>
                                      <div className={styles.medIconAI}>
                                        <svg
                                          viewBox="0 0 24 24"
                                          fill="currentColor"
                                          width="18"
                                        >
                                          <path d="M10.5 20.5a7 7 0 1 1 9.9-9.9l-6.3 6.3a3.5 3.5 0 1 1-4.9-4.9l5.1-5.1" />
                                        </svg>
                                      </div>
                                      <div className={styles.medInfoAI}>
                                        <div className={styles.medNameRow}>
                                          <span className={styles.medNameAI}>
                                            {m.name}
                                          </span>
                                          <span className={styles.medTagAI}>
                                            Scheduled
                                          </span>
                                        </div>
                                        <p className={styles.medPurposeAI}>
                                          {m.purpose}
                                        </p>
                                        {m.dosage && (
                                          <div
                                            className={styles.medDosageAI}
                                            style={{
                                              marginTop: "8px",
                                              padding: "4px 10px",
                                              background: "#f5f3ff",
                                              color: "#5b21b6",
                                              borderRadius: "6px",
                                              fontSize: "11px",
                                              fontWeight: 700,
                                              display: "inline-block",
                                            }}
                                          >
                                            ️ {m.dosage}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ),
                                )}
                              </div>
                            </div>

                            <div className={styles.careCard}>
                              <div className={styles.cardHeader}>
                                <div className={styles.headerIcon}></div>
                                <h3>{t.care}</h3>
                              </div>
                              <div className={styles.careContent}>
                                <p>{activeSummary?.care}</p>
                              </div>
                            </div>
                          </div>

                          <div className={styles.gridRight}>
                            <div className={styles.expectCard}>
                              <div className={styles.cardHeader}>
                                <div className={styles.headerIcon}>⏳</div>
                                <h3>{t.expectations}</h3>
                              </div>
                              <div className={styles.timelineContent}>
                                <p>{activeSummary?.expectations}</p>
                              </div>
                            </div>

                            <div className={styles.warningCard}>
                              <div className={styles.cardHeader}>
                                <div className={styles.headerIcon}></div>
                                <h3 style={{ color: "#ef4444" }}>
                                  {t.warnings}
                                </h3>
                              </div>
                              <div className={styles.warningContent}>
                                {Array.isArray(activeSummary?.warnings) ? (
                                  <ul className={styles.warningList}>
                                    {activeSummary.warnings.map(
                                      (w: string, i: number) => (
                                        <li key={i}>{w}</li>
                                      ),
                                    )}
                                  </ul>
                                ) : (
                                  <p>
                                    {activeSummary?.warnings ||
                                      "No specific warning signs to report."}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div
                              className={styles.nextStepsCard}
                              style={{
                                background: "#f8fafc",
                                border: "1px solid #e2e8f0",
                                borderRadius: 20,
                                padding: 24,
                                marginTop: 20,
                              }}
                            >
                              <div
                                className={styles.cardHeader}
                                style={{ marginBottom: 16 }}
                              >
                                <div className={styles.headerIcon}></div>
                                <h3
                                  style={{
                                    margin: 0,
                                    fontWeight: 900,
                                    color: "var(--text-main)",
                                    fontSize: 13,
                                  }}
                                >
                                  {t.nextSteps}
                                </h3>
                              </div>
                              <p
                                style={{
                                  margin: 0,
                                  fontSize: 13,
                                  color: "var(--text-soft)",
                                  lineHeight: 1.6,
                                  fontWeight: 500,
                                }}
                              >
                                {activeSummary?.next_steps}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className={styles.aiLoadingHero}>
                        <div className={styles.aiLoadingPulse}>
                          <svg viewBox="0 0 24 24" fill="white" width="32">
                            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                          </svg>
                        </div>
                        <div className={styles.aiBadge}>{t.aiPreparing}</div>
                        <p
                          style={{
                            maxWidth: 400,
                            margin: "0 auto",
                            color: "var(--text-soft)",
                            fontWeight: 500,
                          }}
                        >
                          {t.aiAnalyzing}
                        </p>
                      </div>
                    )}
                  </>
                )}

                {activeTab === "Care Guidance" && rx?.guidance_sheet && (
                  <div className={styles.tabContent}>
                    <div className={styles.dgWrapper}>
                      {/* Header */}
                      <div className={styles.dgHeader}>
                        <div className={styles.dgHeaderIcon}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" />
                            <path d="M12 7v10" />
                            <path d="M8 11h8" />
                          </svg>
                        </div>
                        <div className={styles.dgHeaderText}>
                          <h2>Personalized Care Plan & Advice</h2>
                          <p>AI-generated care guidance tailored to your condition, approved by Dr. {(rx.doctor_name || "Consulting Physician").replace(/^(Dr\.\s*|Dr\s+)/i, "")}</p>
                        </div>
                      </div>

                      {/* 6 Core Components Grid */}
                      <div className={styles.dgGrid}>
                        
                        {/* 1. Understanding Condition */}
                        {rx.guidance_sheet.understanding_condition && (rx.guidance_sheet.understanding_condition.disease_name || rx.guidance_sheet.understanding_condition.points?.length > 0) && (
                          <div className={`${styles.dgCard} ${styles.dgCardCondition}`}>
                            <div className={styles.dgCardHeader}>
                              <div className={styles.dgCardIcon}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <circle cx="12" cy="12" r="10" />
                                  <path d="M12 16v-4" />
                                  <path d="M12 8h.01" />
                                </svg>
                              </div>
                              <span className={styles.dgCardTitle}>Understanding Condition</span>
                            </div>
                            {rx.guidance_sheet.understanding_condition.disease_name && (
                              <div className={styles.dgConditionName}>
                                {rx.guidance_sheet.understanding_condition.disease_name}
                              </div>
                            )}
                            <ul className={styles.dgPointsList}>
                              {(rx.guidance_sheet.understanding_condition.points || []).map((pt: string, idx: number) => (
                                <li key={idx} className={styles.dgPointItem}>{pt}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* 2. Diet & Nutrition */}
                        {rx.guidance_sheet.diet_nutrition && rx.guidance_sheet.diet_nutrition.points?.length > 0 && (
                          <div className={`${styles.dgCard} ${styles.dgCardDiet}`}>
                            <div className={styles.dgCardHeader}>
                              <div className={styles.dgCardIcon}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                                </svg>
                              </div>
                              <span className={styles.dgCardTitle}>Diet & Nutrition</span>
                            </div>
                            <ul className={styles.dgPointsList}>
                              {(rx.guidance_sheet.diet_nutrition.points || []).map((pt: string, idx: number) => (
                                <li key={idx} className={styles.dgPointItem}>{pt}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* 3. Hydration */}
                        {rx.guidance_sheet.hydration && (rx.guidance_sheet.hydration.points?.length > 0 || rx.guidance_sheet.hydration.tip) && (
                          <div className={`${styles.dgCard} ${styles.dgCardHydration}`}>
                            <div className={styles.dgCardHeader}>
                              <div className={styles.dgCardIcon}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <path d="M12 22a7 7 0 0 0 7-7c0-4.3-7-11-7-11S5 10.7 5 15a7 7 0 0 0 7 7z" />
                                </svg>
                              </div>
                              <span className={styles.dgCardTitle}>Water & Hydration</span>
                            </div>
                            <ul className={styles.dgPointsList}>
                              {(rx.guidance_sheet.hydration.points || []).map((pt: string, idx: number) => (
                                <li key={idx} className={styles.dgPointItem}>{pt}</li>
                              ))}
                            </ul>
                            {rx.guidance_sheet.hydration.tip && (
                              <div className={styles.dgCallout}>
                                <span>💡</span>
                                <span>{rx.guidance_sheet.hydration.tip}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* 4. Activity & Exercise */}
                        {rx.guidance_sheet.activity_exercise && (rx.guidance_sheet.activity_exercise.points?.length > 0 || rx.guidance_sheet.activity_exercise.tip) && (
                          <div className={`${styles.dgCard} ${styles.dgCardActivity}`}>
                            <div className={styles.dgCardHeader}>
                              <div className={styles.dgCardIcon}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                                </svg>
                              </div>
                              <span className={styles.dgCardTitle}>Activity & Exercise</span>
                            </div>
                            <ul className={styles.dgPointsList}>
                              {(rx.guidance_sheet.activity_exercise.points || []).map((pt: string, idx: number) => (
                                <li key={idx} className={styles.dgPointItem}>{pt}</li>
                              ))}
                            </ul>
                            {rx.guidance_sheet.activity_exercise.tip && (
                              <div className={styles.dgCallout}>
                                <span>🏃‍♂️</span>
                                <span>{rx.guidance_sheet.activity_exercise.tip}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* 5. Things to Avoid */}
                        {rx.guidance_sheet.things_to_avoid && rx.guidance_sheet.things_to_avoid.items?.length > 0 && (
                          <div className={`${styles.dgCard} ${styles.dgCardAvoid}`}>
                            <div className={styles.dgCardHeader}>
                              <div className={styles.dgCardIcon}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <circle cx="12" cy="12" r="10" />
                                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                                </svg>
                              </div>
                              <span className={styles.dgCardTitle}>Things to Avoid</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              {(rx.guidance_sheet.things_to_avoid.items || []).map((item: any, idx: number) => (
                                <div key={idx} className={styles.dgAvoidItem}>
                                  <div className={styles.dgAvoidHeader}>
                                    <span>❌</span>
                                    <span>{item.text}</span>
                                  </div>
                                  {item.reason && <div className={styles.dgAvoidReason}>{item.reason}</div>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 6. Warning Signs */}
                        {rx.guidance_sheet.warning_signs && (rx.guidance_sheet.warning_signs.red_flags?.length > 0 || rx.guidance_sheet.warning_signs.follow_up) && (
                          <div className={`${styles.dgCard} ${styles.dgCardWarning}`}>
                            <div className={styles.dgCardHeader}>
                              <div className={styles.dgCardIcon}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                  <line x1="12" y1="9" x2="12" y2="13" />
                                  <line x1="12" y1="17" x2="12.01" y2="17" />
                                </svg>
                              </div>
                              <span className={styles.dgCardTitle}>Warning Signs</span>
                            </div>
                            <ul className={styles.dgPointsList}>
                              {(rx.guidance_sheet.warning_signs.red_flags || []).map((pt: string, idx: number) => (
                                <li key={idx} className={styles.dgRedFlagItem}>{pt}</li>
                              ))}
                            </ul>
                            {rx.guidance_sheet.warning_signs.follow_up && (
                              <div className={styles.dgCallout}>
                                <span>🚨</span>
                                <span><strong>Follow-up:</strong> {rx.guidance_sheet.warning_signs.follow_up}</span>
                              </div>
                            )}
                          </div>
                        )}

                      </div>

                      {/* General Tips Banner */}
                      {rx.guidance_sheet.general_tips && rx.guidance_sheet.general_tips.length > 0 && (
                        <div className={styles.dgGeneralTipsBanner}>
                          <div className={styles.dgGeneralTipsTitle}>
                            <span>🛡️</span> General Health Tips & Wellness Guidelines
                          </div>
                          <div className={styles.dgGeneralTipsGrid}>
                            {rx.guidance_sheet.general_tips.map((tip: string, idx: number) => (
                              <div key={idx} className={styles.dgGeneralTipItem}>
                                <span className={styles.dgGeneralTipIcon}>✨</span>
                                <div>{tip}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === "Patient History" && (
                  <div id="history" className={styles.historyContainer}>
                    <div className={styles.historyHeader}>
                      <h1 className={styles.historyTitle}>{t.history}</h1>
                      <p className={styles.historySub}>
                        View past consultations and treatment progress for{" "}
                        {patient?.name}.
                      </p>
                    </div>

                    {loadingHistory ? (
                      <div className={styles.historyLoading}>
                        <div className={styles.loader}></div>
                        <p>{t.retrieving}</p>
                      </div>
                    ) : history?.visits && history.visits.length > 0 ? (
                      <div className={styles.timeline}>
                        {history.visits.map((visit: any, index: number) => (
                          <div key={index} className={styles.timelineItem}>
                            <div className={styles.timelineDate}>
                              {new Date(visit.visit_date).toLocaleDateString(
                                "en-IN",
                                {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                },
                              )}
                            </div>
                            <div className={styles.timelinePoint}></div>
                            <div className={styles.timelineContent}>
                              <div className={styles.visitHeader}>
                                <div className={styles.visitType}>
                                  {t.consultation}
                                </div>
                                <div className={styles.visitDoctor}>
                                  {visit.doctor}
                                </div>
                              </div>
                              <div className={styles.visitBody}>
                                <div className={styles.visitSection}>
                                  <div className={styles.visitLabel}>
                                    {t.cc}
                                  </div>
                                  <div className={styles.visitValue}>
                                    {visit.complaints}
                                  </div>
                                </div>
                                <div className={styles.visitSection}>
                                  <div className={styles.visitLabel}>
                                    {t.prescribed}
                                  </div>
                                  <div className={styles.visitValue}>
                                    {visit.medicines &&
                                    visit.medicines.length > 0
                                      ? visit.medicines
                                          .map((m: any) => m.name)
                                          .join(", ")
                                      : t.noMedsPrescribed}
                                  </div>
                                </div>
                              </div>
                              <Link
                                href={`/view/${visit.prescription_id}`}
                                className={styles.viewVisitBtn}
                                onClick={() => setActiveTab("Current Script")}
                              >
                                {t.viewFullRx}
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="3"
                                  style={{ marginLeft: 4 }}
                                >
                                  <path d="M5 12h14M12 5l7 7-7 7" />
                                </svg>
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className={styles.noHistory}>
                        <div className={styles.noHistoryIcon}></div>
                        <h3>{t.noPastVisits}</h3>
                        <p>{t.firstVisit}</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "Drug Interaction" && (
                  <div className={styles.placeholderView}>
                    <div className={styles.placeholderIcon}>️</div>
                    <h2>Drug Interaction Checker</h2>
                    <p>
                      This module uses AI to check for potential interactions
                      between prescribed medications. It is currently being
                      calibrated for your clinical safety.
                    </p>
                  </div>
                )}

                {activeTab === "Clinic Notes" && (
                  <div className={styles.placeholderView}>
                    <div className={styles.placeholderIcon}></div>
                    <h2>Confidential Clinic Notes</h2>
                    <p>
                      Doctor's internal notes and private clinical observations
                      for this patient record.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </main>

        {/* --- LANGUAGE SELECTION MODAL --- */}
        {showLangModal && (
          <div className={styles.modalOverlay}>
            <div className={styles.langModal}>
              <h2>Select Language</h2>
              <p>Choose your preferred language for the AI clinical guide.</p>
              <div className={styles.langGrid}>
                {languages.map((l) => (
                  <div
                    key={l.name}
                    className={styles.langCard}
                    onClick={() => handleLangSelect(l.name)}
                  >
                    <div className={styles.langIcon}>{l.icon}</div>
                    <div className={styles.langName}>{l.name}</div>
                    <div className={styles.langSub}>{l.sub}</div>
                  </div>
                ))}
              </div>
              <button
                style={{
                  marginTop: 24,
                  background: "none",
                  border: "none",
                  color: "var(--text-soft)",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
                onClick={() => setShowLangModal(false)}
              >
                Continue in English
              </button>
            </div>
          </div>
        )}

        {/* --- DOCTOR PROFILE MODAL --- */}
        {showDocProfile && (
          <div
            className={styles.modalOverlay}
            onClick={() => setShowDocProfile(false)}
          >
            <div
              className={styles.langModal}
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: 400, textAlign: "left", padding: 24 }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    background: "#f1f5f9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 24,
                    fontWeight: 800,
                    color: "#4f46e5",
                  }}
                >
                  {(doctor?.name ||
                    rx?.doctor_name ||
                    "Dr")?.[0]?.toUpperCase() || "D"}
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 20 }}>
                    {doctor?.name || rx?.doctor_name || "Consulting Doctor"}
                  </h2>
                  <p
                    style={{
                      margin: 0,
                      color: "var(--text-soft)",
                      fontWeight: 500,
                    }}
                  >
                    {doctor?.specialty || "General Consultant"}
                  </p>
                </div>
              </div>

              <div
                style={{
                  background: "#f8fafc",
                  padding: 16,
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                  marginBottom: 20,
                }}
              >
                <div style={{ marginBottom: 12 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      color: "var(--text-soft)",
                      letterSpacing: 0.5,
                      marginBottom: 4,
                    }}
                  >
                    {t.qualification}
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "var(--text-main)",
                    }}
                  >
                    {doctor?.qualification || "MBBS, MD"}
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      color: "var(--text-soft)",
                      letterSpacing: 0.5,
                      marginBottom: 4,
                    }}
                  >
                    {t.regNo}
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "var(--text-main)",
                    }}
                  >
                    {doctor?.registration_number || "N/A"}
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      color: "var(--text-soft)",
                      letterSpacing: 0.5,
                      marginBottom: 4,
                    }}
                  >
                    {t.consultFee}
                  </div>
                  <div
                    style={{ fontSize: 14, fontWeight: 600, color: "#059669" }}
                  >
                    {doctor?.consultation_fee
                      ? `₹${doctor.consultation_fee}`
                      : "₹ 500"}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: "center" }}>
                <button
                  style={{
                    background: "#4f46e5",
                    color: "white",
                    border: "none",
                    padding: "10px 24px",
                    borderRadius: 8,
                    fontWeight: 700,
                    cursor: "pointer",
                    width: "100%",
                  }}
                  onClick={() => setShowDocProfile(false)}
                >
                  {t.closeProfile}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- BROWSER TTS CONTROLS --- */}
        {activeTab === "AI Summary" && activeSummary && (
          <div className={styles.ttsControls}>
            {showSpeechPopup && !isSpeaking && (
              <div className={styles.speechPopup}>
                <span
                  onClick={handleToggleSpeech}
                  style={{ cursor: "pointer" }}
                >
                  {t.tapToListen}
                </span>
                <button
                  className={styles.closePopup}
                  onClick={() => setShowSpeechPopup(false)}
                >
                  ×
                </button>
              </div>
            )}
            <button
              className={`${styles.listenButton} ${isSpeaking ? styles.listenButtonActive : ""}`}
              onClick={handleToggleSpeech}
              title={isSpeaking ? t.stopListen : t.listenSummary}
            >
              {isSpeaking ? (
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <rect x="6" y="4" width="4" height="16"></rect>
                  <rect x="14" y="4" width="4" height="16"></rect>
                </svg>
              ) : (
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M11 5L6 9H2v6h4l5 4V5z"></path>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                </svg>
              )}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
