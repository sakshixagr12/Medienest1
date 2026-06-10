"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { normalizeDoctorName } from "@/lib/utils";
import { Hospital, Users, Clock, ShieldCheck, Mail, ArrowRight, Check } from "lucide-react";
import styles from "./page.module.css";

interface Doctor {
  name: string;
  qualification: string;
  contact: string;
  specialty: string;
  registration_number: string;
  license_expiry_date?: string;
  profile_photo_url?: string;
  is_active: boolean;
  display_order: number;
}

// ── CUSTOM SVG LEAVES FOR BOTTOM LEFT CORNER ──
function LeavesLeftBottom({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Stem */}
      <path
        d="M0 160 C 25 135, 55 115, 95 105"
        stroke="#2E7D32"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.35"
      />
      {/* Leaf 1 (Low) */}
      <path
        d="M15 155 C 28 128, 48 123, 52 143 C 37 148, 22 153, 15 155 Z"
        fill="url(#leftLeafGrad1)"
      />
      {/* Leaf 2 (Mid) */}
      <path
        d="M45 125 C 65 102, 80 107, 75 128 C 58 128, 48 128, 45 125 Z"
        fill="url(#leftLeafGrad2)"
      />
      {/* Leaf 3 (High) */}
      <path
        d="M75 110 C 100 88, 118 98, 108 120 C 90 120, 80 115, 75 110 Z"
        fill="url(#leftLeafGrad1)"
      />
      <defs>
        <linearGradient id="leftLeafGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#81C784" />
          <stop offset="100%" stopColor="#2E7D32" />
        </linearGradient>
        <linearGradient id="leftLeafGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#A5D6A7" />
          <stop offset="100%" stopColor="#1B5E20" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ── CUSTOM SVG LEAVES FOR CARD TOP RIGHT CORNER ──
function LeavesBranch({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Stem */}
      <path
        d="M92 8 C 77 23, 58 32, 32 38"
        stroke="#2E7D32"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity="0.45"
      />
      {/* Leaf 1 (Top Right) */}
      <path
        d="M87 13 C 90 26, 82 37, 72 39 C 70 27, 77 15, 87 13 Z"
        fill="url(#leafGrad1)"
      />
      {/* Leaf 2 (Middle Right) */}
      <path
        d="M67 23 C 70 33, 62 43, 54 43 C 52 33, 57 23, 67 23 Z"
        fill="url(#leafGrad2)"
      />
      {/* Leaf 3 (Middle Left) */}
      <path
        d="M52 30 C 54 38, 48 46, 42 46 C 40 38, 44 30, 52 30 Z"
        fill="url(#leafGrad1)"
      />
      {/* Leaf 4 (Bottom Left) */}
      <path
        d="M37 35 C 39 41, 35 47, 30 46 C 28 40, 31 34, 37 35 Z"
        fill="url(#leafGrad2)"
      />
      {/* Leaf 5 (Offshoot Top) */}
      <path
        d="M79 8 C 71 10, 66 6, 63 0 C 71 0, 76 4, 79 8 Z"
        fill="url(#leafGrad1)"
      />
      <defs>
        <linearGradient id="leafGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#81C784" />
          <stop offset="100%" stopColor="#2E7D32" />
        </linearGradient>
        <linearGradient id="leafGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#A5D6A7" />
          <stop offset="100%" stopColor="#1B5E20" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ── CUSTOM SVG LEAVES FOR MOBILE TOP LEFT ──
function LeavesTopLeftMobile({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Stem */}
      <path
        d="M10 0 C 20 40, 40 70, 80 90"
        stroke="#2E7D32"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.35"
      />
      {/* Leaf 1 */}
      <path
        d="M20 15 C 32 30, 25 45, 10 35 C 5 25, 12 10, 20 15 Z"
        fill="url(#mobileTopLeafGrad)"
      />
      {/* Leaf 2 */}
      <path
        d="M38 35 C 50 50, 43 65, 28 55 C 23 45, 30 30, 38 35 Z"
        fill="url(#mobileTopLeafGrad)"
      />
      {/* Leaf 3 */}
      <path
        d="M55 55 C 68 70, 60 85, 45 75 C 40 65, 48 50, 55 55 Z"
        fill="url(#mobileTopLeafGrad)"
      />
      <defs>
        <linearGradient id="mobileTopLeafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#A5D6A7" />
          <stop offset="100%" stopColor="#2E7D32" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ── CUSTOM SVG LEAVES FOR MOBILE BOTTOM RIGHT ──
function LeavesBottomRightMobile({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Stem */}
      <path
        d="M150 160 C 140 120, 120 90, 80 70"
        stroke="#2E7D32"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.35"
      />
      {/* Leaf 1 */}
      <path
        d="M140 145 C 128 130, 135 115, 150 125 C 155 135, 148 150, 140 145 Z"
        fill="url(#mobileBottomLeafGrad)"
      />
      {/* Leaf 2 */}
      <path
        d="M122 125 C 110 110, 117 95, 132 105 C 137 115, 130 130, 122 125 Z"
        fill="url(#mobileBottomLeafGrad)"
      />
      {/* Leaf 3 */}
      <path
        d="M105 105 C 92 90, 100 75, 115 85 C 120 95, 112 110, 105 105 Z"
        fill="url(#mobileBottomLeafGrad)"
      />
      <defs>
        <linearGradient id="mobileBottomLeafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#A5D6A7" />
          <stop offset="100%" stopColor="#2E7D32" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(1);
  const [roleChoice, setRoleChoice] = useState<"clinic" | "store">("clinic");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const choice = localStorage.getItem("user_role_choice") as "clinic" | "store";
      if (choice === "store" || choice === "clinic") {
        setRoleChoice(choice);
      }
    }
  }, []);

  // Step 1 state
  const [clinicName, setClinicName] = useState("");
  const [clinicNameHindi, setClinicNameHindi] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [tagline, setTagline] = useState("");
  const [step1Error, setStep1Error] = useState("");

  // Step 2 state
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [docName, setDocName] = useState("");
  const [docQual, setDocQual] = useState("");
  const [docContact, setDocContact] = useState("");
  const [docSpecialty, setDocSpecialty] = useState("");
  const [docRegNumber, setDocRegNumber] = useState("");
  const [docExpiry, setDocExpiry] = useState("");
  const [docPhoto, setDocPhoto] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [step2Error, setStep2Error] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const goStep2 = () => {
    if (!clinicName) {
      setStep1Error("Clinic name is required.");
      return;
    }
    if (!phone) {
      setStep1Error("Phone number is required.");
      return;
    }
    setStep1Error("");
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const addDoctor = () => {
    if (!docName.trim()) {
      setStep2Error("Doctor name is required.");
      return;
    }
    if (!docRegNumber.trim()) {
      setStep2Error("Medical License Number is required.");
      return;
    }

    const normalizedName = normalizeDoctorName(docName);

    const docData: Doctor = {
      name: normalizedName,
      qualification: docQual.trim(),
      contact: docContact.trim(),
      specialty: docSpecialty.trim() || "General Medicine",
      registration_number: docRegNumber.trim(),
      license_expiry_date: docExpiry || undefined,
      profile_photo_url: docPhoto || undefined,
      is_active: true,
      display_order:
        editingIndex !== null
          ? doctors[editingIndex].display_order
          : doctors.length,
    };

    if (editingIndex !== null) {
      setDoctors((prev) => {
        const updated = [...prev];
        updated[editingIndex] = docData;
        return updated;
      });
      setEditingIndex(null);
    } else {
      setDoctors((prev) => [...prev, docData]);
    }

    setDocName("");
    setDocQual("");
    setDocContact("");
    setDocSpecialty("");
    setDocRegNumber("");
    setDocExpiry("");
    setDocPhoto("");
    setStep2Error("");
  };

  const prepareEdit = (i: number) => {
    const d = doctors[i];
    setDocName(d.name);
    setDocQual(d.qualification);
    setDocContact(d.contact);
    setDocSpecialty(d.specialty);
    setDocRegNumber(d.registration_number);
    setDocExpiry(d.license_expiry_date || "");
    setDocPhoto(d.profile_photo_url || "");
    setEditingIndex(i);
    setStep2Error("");
    window.scrollTo({ top: 400, behavior: "smooth" }); // Scroll to form
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setDocName("");
    setDocQual("");
    setDocContact("");
    setDocSpecialty("");
    setDocRegNumber("");
    setDocExpiry("");
    setDocPhoto("");
    setStep2Error("");
  };

  const removeDoctor = (i: number) => {
    setDoctors((prev) =>
      prev
        .filter((_, idx) => idx !== i)
        .map((d, j) => ({ ...d, display_order: j })),
    );
  };

  const handleSubmit = async () => {
    if (
      doctors.length === 0 &&
      !(await confirm("You have not added any doctors. Continue without adding?"))
    )
      return;
    setSubmitting(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      let user = session?.user || null;
      if (!user) {
        try {
          const {
            data: { user: verifiedUser },
          } = await supabase.auth.getUser();
          user = verifiedUser;
        } catch (authErr) {
          console.warn(
            "⚠️ Onboarding auth fetch error, using session cache:",
            authErr,
          );
        }
      }
      if (!user) {
        router.replace("/auth");
        return;
      }

      const fullAddress = [address, city].filter(Boolean).join(", ");
      const { data: clinic, error: clinicErr } = await supabase
        .from("clinics")
        .insert({
          name: clinicName,
          name_hindi: clinicNameHindi || null,
          phone,
          address: fullAddress,
          tagline: tagline || "Quality Healthcare for All",
          email: user.email,
          owner_user_id: user.id,
          status: "pending",
          clinic_type: roleChoice,
        })
        .select()
        .single();

      if (clinicErr) throw clinicErr;

      if (doctors.length > 0) {
        for (const d of doctors) {
          // 1. Insert into global doctors registry
          const { data: docRecord, error: docErr } = await supabase
            .from("doctors")
            .insert({
              name: d.name,
              qualification: d.qualification,
              contact: d.contact,
              specialty: d.specialty,
              registration_number: d.registration_number,
              license_expiry_date: d.license_expiry_date,
              profile_photo_url: d.profile_photo_url,
            })
            .select()
            .single();

          if (docErr) throw docErr;

          // 2. Map doctor to this specific clinic context
          const { error: assocErr } = await supabase
            .from("clinic_doctors")
            .insert({
              clinic_id: clinic.id,
              doctor_id: docRecord.id,
              display_order: d.display_order,
              is_active: d.is_active,
            });

          if (assocErr) throw assocErr;
        }
      }

      setStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      setStep2Error(err.message || "Submission failed. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.overlay} />

      {/* Decorative Mobile Viewport SVGs */}
      <LeavesTopLeftMobile className={styles.leavesTopLeftMobile} />
      <LeavesBottomRightMobile className={styles.leavesBottomRightMobile} />

      <div className={styles.container}>
        {/* Left Panel: Desktop Stepper */}
        <aside className={styles.leftPanel}>
          <LeavesLeftBottom className={styles.leavesLeftBottom} />
          
          <div className={styles.leftPanelTopGroup}>
            <div className={styles.logoRow}>
              <Image
                src="/assets/medienest_logo.png"
                alt="MedieNest Logo"
                width={64}
                height={64}
                style={{ objectFit: "contain" }}
              />
              <span className={styles.logoText}>MedieNest</span>
            </div>

            <div className={styles.leftMainContent}>
              <h1>{roleChoice === "store" ? "Store Onboarding" : "Onboarding Process"}</h1>
              <div className={styles.horizontalLine} />
              <p>{roleChoice === "store" ? "Setup your medical store details to get started with MedieNest." : "Setup your clinic details and configure practitioner profiles to get started with MedieNest."}</p>
            </div>

            <nav className={styles.navMenu}>
              {/* Clinic Setup */}
              <div
                className={`${styles.navItem} ${step === 1 ? styles.navItemActive : ""} ${step > 1 ? styles.navItemCompleted : ""}`}
                onClick={() => step !== 3 && setStep(1)}
                style={{ cursor: step !== 3 ? "pointer" : "default" }}
              >
                <div className={styles.navIconCircle}>
                  {step > 1 ? <Check size={18} /> : <Hospital size={20} />}
                </div>
                <div className={styles.navTextWrapper}>
                  <span className={styles.navStepNumber}>Step 01</span>
                  <span className={styles.navStepTitle}>{roleChoice === "store" ? "Store Setup" : "Clinic Setup"}</span>
                </div>
              </div>
              
              {/* Team Members */}
              {roleChoice !== "store" && (
                <div
                  className={`${styles.navItem} ${step === 2 ? styles.navItemActive : ""} ${step > 2 ? styles.navItemCompleted : ""}`}
                  onClick={() => (step === 1 ? goStep2() : undefined)}
                  style={{ cursor: step === 1 ? "pointer" : "default" }}
                >
                  <div className={styles.navIconCircle}>
                    {step > 2 ? <Check size={18} /> : <Users size={20} />}
                  </div>
                  <div className={styles.navTextWrapper}>
                    <span className={styles.navStepNumber}>Step 02</span>
                    <span className={styles.navStepTitle}>Team Members</span>
                  </div>
                </div>
              )}

              {/* Status */}
              <div
                className={`${styles.navItem} ${step === 3 ? styles.navItemActive : ""}`}
              >
                <div className={styles.navIconCircle}>
                  <Clock size={20} />
                </div>
                <div className={styles.navTextWrapper}>
                  <span className={styles.navStepNumber}>{roleChoice === "store" ? "Step 02" : "Step 03"}</span>
                  <span className={styles.navStepTitle}>Review Status</span>
                </div>
              </div>
            </nav>
          </div>

          <div className={styles.leftPanelFooter}>
            Need help?{" "}
            <Link href="mailto:concierge@medienest.com" className={styles.leftPanelFooterLink}>
              Contact support
            </Link>
          </div>
        </aside>

        {/* Right Panel: Scrollable Area with the premium onboardingCard */}
        <div className={styles.rightPanel}>
          <div className={styles.mobileLogoContainer}>
            <div className={styles.mobileLogoRow}>
              <Image
                src="/assets/medienest_logo.png"
                alt="MedieNest Logo"
                width={42}
                height={42}
                style={{ objectFit: "contain" }}
              />
              <span className={styles.mobileLogoText}>MedieNest</span>
            </div>
            <p className={styles.mobileLogoTagline}>Compassion. Care. Connected.</p>
          </div>

          <main className={styles.onboardingCard}>
            <LeavesBranch className={styles.leavesCardCorner} />

            <div className={styles.cardHeaderArea}>
              <div className={styles.logoCircle}>
                <Hospital size={28} className={styles.hospitalIcon} />
              </div>

              <h2 className={styles.cardHeading}>
                {step === 1 && (roleChoice === "store" ? "Store Setup" : "Clinic Setup")}
                {step === 2 && "Team Members"}
                {step === 3 && "Registration Status"}
              </h2>

              <div className={styles.heartSeparator}>
                <span className={styles.separatorLine} />
                <span className={styles.heartIcon}>💚</span>
                <span className={styles.separatorLine} />
              </div>

              {/* Mobile Stepper Progress bar (hidden on desktop) */}
              <div className={styles.mobileStepIndicator}>
                Step {step} of {roleChoice === "store" ? 2 : 3} • {step === 1 ? (roleChoice === "store" ? "Store Setup" : "Clinic Setup") : step === 2 ? "Team Members" : "Status"}
              </div>

              <p className={styles.cardSubtext}>
                {step === 1 && (roleChoice === "store" ? "Tell us about your medical store. This information will be visible on invoice receipts and used for billing." : "Tell us about your clinic's digital presence. This information will be visible to patients and used for billing.")}
                {step === 2 && "List the practitioners who will be using MedieNest. You can update this later from settings."}
                {step === 3 && "Thank you for choosing MedieNest. We are currently auditing your credentials."}
              </p>
            </div>

            {/* STEP 1: CLINIC SETUP FORM */}
            {step === 1 && (
              <div className={styles.formContainer}>
                {step1Error && <div className={styles.errMsg}>{step1Error}</div>}

                {/* ── SEGMENTED SELECTOR FOR ACCOUNT TYPE ── */}
                <div style={{ marginBottom: "24px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "#374151", letterSpacing: "0.3px", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>
                    Select Account Type
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "14px 18px",
                        borderRadius: "12px",
                        border: roleChoice === "clinic" ? "2.5px solid #2E7D32" : "1.5px solid #E5E7EB",
                        background: roleChoice === "clinic" ? "#EAF3EA" : "#F9FAFB",
                        cursor: "pointer",
                        transition: "all 0.2s ease"
                      }}
                      onClick={() => {
                        setRoleChoice("clinic");
                        if (typeof window !== "undefined") {
                          localStorage.setItem("user_role_choice", "clinic");
                        }
                      }}
                    >
                      <Hospital size={18} style={{ color: roleChoice === "clinic" ? "#2E7D32" : "#9CA3AF" }} />
                      <span style={{ fontSize: "14.5px", fontWeight: 700, color: roleChoice === "clinic" ? "#2E7D32" : "#4B5563" }}>Clinic / Hospital</span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "14px 18px",
                        borderRadius: "12px",
                        border: roleChoice === "store" ? "2.5px solid #2E7D32" : "1.5px solid #E5E7EB",
                        background: roleChoice === "store" ? "#EAF3EA" : "#F9FAFB",
                        cursor: "pointer",
                        transition: "all 0.2s ease"
                      }}
                      onClick={() => {
                        setRoleChoice("store");
                        if (typeof window !== "undefined") {
                          localStorage.setItem("user_role_choice", "store");
                        }
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: roleChoice === "store" ? "#2E7D32" : "#9CA3AF" }}>
                        <path d="m2 22 1-1h3l9-9" />
                        <path d="M12.5 7.5 17 3c1-1 3-1 4 0s1 3 0 4l-4.5 4.5" />
                        <path d="m8 11 5 5" />
                      </svg>
                      <span style={{ fontSize: "14.5px", fontWeight: 700, color: roleChoice === "store" ? "#2E7D32" : "#4B5563" }}>Medical Store</span>
                    </div>
                  </div>
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.formField}>
                    <label>
                      {roleChoice === "store" ? "Medical Store Name" : "Clinic/Hospital Name"} <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input
                      className={styles.inputBox}
                      value={clinicName}
                      onChange={(e) => setClinicName(e.target.value)}
                      placeholder="e.g. Serenity Wellness Center"
                      autoFocus
                    />
                  </div>

                  <div className={styles.formField}>
                    <label>
                      {roleChoice === "store" ? "Store Name in Hindi" : "Clinic Name in Hindi"} <span>(Optional)</span>
                    </label>
                    <input
                      className={styles.inputBox}
                      value={clinicNameHindi}
                      onChange={(e) => setClinicNameHindi(e.target.value)}
                      placeholder="e.g. सेरेनिटी वेलनेस सेंटर"
                    />
                  </div>

                  <div className={styles.formField}>
                    <label>
                      Phone Number <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <div className={styles.inputWithIcon}>
                      <span className={styles.prefixIcon}>+91</span>
                      <input
                        className={styles.inputBox}
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="98765 43210"
                      />
                    </div>
                  </div>

                  <div className={styles.formField}>
                    <label>
                      City/Location <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <div className={styles.inputWithIcon}>
                      <input
                        className={styles.inputBox}
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="e.g. South Delhi"
                      />
                      <svg
                        className={styles.suffixIcon}
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </div>
                  </div>

                  <div className={`${styles.formField} ${styles.fullWidth}`}>
                    <label>
                      Full Address <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <textarea
                      className={styles.inputBox}
                      rows={2}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Street name, landmark, and postal code"
                    />
                  </div>

                  <div className={`${styles.formField} ${styles.fullWidth}`}>
                    <label>
                      {roleChoice === "store" ? "Store Tagline" : "Clinic Tagline"} <span>(Optional)</span>
                    </label>
                    <input
                      className={styles.inputBox}
                      value={tagline}
                      onChange={(e) => setTagline(e.target.value)}
                      placeholder="e.g. Compassionate Care for Every Soul"
                    />
                  </div>
                </div>

                <div className={styles.formFooter}>
                  <div />
                  {roleChoice === "store" ? (
                    <button
                      className={styles.btnNext}
                      onClick={handleSubmit}
                      disabled={submitting}
                    >
                      {submitting ? "Submitting..." : "Submit for Onboarding"}
                      <ArrowRight size={18} />
                    </button>
                  ) : (
                    <button className={styles.btnNext} onClick={goStep2}>
                      Next: Add Doctors
                      <ArrowRight size={18} />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* STEP 2: TEAM MEMBERS FORM */}
            {step === 2 && (
              <div className={styles.formContainer}>
                {step2Error && <div className={styles.errMsg}>{step2Error}</div>}

                <div className={styles.doctorsList}>
                  {doctors.map((d, i) => (
                    <div key={i} className={styles.doctorListItem}>
                      <div className={styles.doctorInfoText}>
                        <strong>Dr. {d.name}</strong> • {d.specialty}
                        <div className={styles.doctorSubText}>
                          {d.qualification} | {d.contact} | Reg: {d.registration_number}
                        </div>
                      </div>
                      <div className={styles.doctorActions}>
                        <button className={styles.btnEditDoc} onClick={() => prepareEdit(i)}>
                          Edit
                        </button>
                        <button className={styles.btnDeleteDoc} onClick={() => removeDoctor(i)}>
                          X
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className={styles.addDoctorForm}>
                  <h3 className={styles.addDoctorFormTitle}>
                    {editingIndex !== null ? "Edit Doctor Details" : "Add New Doctor"}
                  </h3>
                  
                  <div className={styles.formGrid}>
                    <div className={styles.formField}>
                      <label>Doctor's Name</label>
                      <input
                        className={styles.inputBox}
                        value={docName}
                        onChange={(e) => setDocName(e.target.value)}
                        placeholder="e.g. Pradeep Kumar"
                      />
                    </div>
                    
                    <div className={styles.formField}>
                      <label>Specialty</label>
                      <input
                        className={styles.inputBox}
                        value={docSpecialty}
                        onChange={(e) => setDocSpecialty(e.target.value)}
                        placeholder="e.g. Pediatrics"
                      />
                    </div>

                    <div className={styles.formField}>
                      <label>Qualification</label>
                      <input
                        className={styles.inputBox}
                        value={docQual}
                        onChange={(e) => setDocQual(e.target.value)}
                        placeholder="e.g. MBBS, MD"
                      />
                    </div>

                    <div className={styles.formField}>
                      <label>Contact Number</label>
                      <input
                        className={styles.inputBox}
                        value={docContact}
                        onChange={(e) => setDocContact(e.target.value)}
                        placeholder="98XXXXXXXX"
                      />
                    </div>

                    <div className={styles.formField}>
                      <label>
                        Medical License No. <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <input
                        className={styles.inputBox}
                        value={docRegNumber}
                        onChange={(e) => setDocRegNumber(e.target.value)}
                        placeholder="e.g. MCI-12345"
                      />
                    </div>

                    <div className={styles.formField}>
                      <label>License Expiry Date</label>
                      <input
                        className={styles.inputBox}
                        type="date"
                        value={docExpiry}
                        onChange={(e) => setDocExpiry(e.target.value)}
                      />
                    </div>

                    <div className={`${styles.formField} ${styles.fullWidth}`}>
                      <label>
                        Profile Photo URL <span>(Optional)</span>
                      </label>
                      <input
                        className={styles.inputBox}
                        value={docPhoto}
                        onChange={(e) => setDocPhoto(e.target.value)}
                        placeholder="https://example.com/photo.jpg"
                      />
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
                    <button
                      onClick={addDoctor}
                      className={styles.btnSolid}
                      style={{ padding: "10px 20px", borderRadius: "8px" }}
                    >
                      {editingIndex !== null ? "Update Detail" : "Add to List"}
                    </button>
                    {editingIndex !== null && (
                      <button
                        onClick={cancelEdit}
                        className={styles.btnSecondary}
                        style={{ padding: "9px 20px", borderRadius: "8px" }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                <div className={styles.formFooter}>
                  <button className={styles.btnSecondary} onClick={() => setStep(1)}>
                    Back to Setup
                  </button>
                  
                  <button
                    className={styles.btnNext}
                    onClick={handleSubmit}
                    disabled={submitting}
                  >
                    {submitting ? "Submitting..." : "Submit for Approval"}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: WAITLIST STATUS */}
            {step === 3 && (
              <div className={styles.formContainer} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div className={styles.waitlistIconBox}>
                  <Clock size={36} />
                </div>

                <div className={styles.statusPill}>STATUS: PENDING APPROVAL</div>

                <div className={styles.waitlistGrid}>
                  <div className={styles.waitCard}>
                    <div className={styles.waitCardIcon}>
                      <ShieldCheck size={16} />
                    </div>
                    <h4>Quality Audit</h4>
                    <p>We verify all credentials to maintain a secure environment.</p>
                  </div>

                  <div className={styles.waitCard}>
                    <div className={styles.waitCardIcon}>
                      <Clock size={16} />
                    </div>
                    <h4>24h Response</h4>
                    <p>Most approvals are processed within one business day.</p>
                  </div>

                  <div className={styles.waitCard}>
                    <div className={styles.waitCardIcon}>
                      <Mail size={16} />
                    </div>
                    <h4>Next Steps</h4>
                    <p>Check your inbox for a confirmation link once approved.</p>
                  </div>
                </div>

                <div className={styles.waitActions}>
                  <button
                    className={styles.btnSolid}
                    onClick={() => (window.location.href = "mailto:concierge@medienest.com")}
                  >
                    Visit Support Center
                  </button>
                  <button className={styles.btnGray} onClick={() => setStep(1)}>
                    View Info
                  </button>
                </div>

                <div className={styles.contactInfo}>
                  Questions? Contact onboarding concierge at <strong>concierge@medienest.com</strong>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
