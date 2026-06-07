"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useClinic } from "@/context/ClinicContext";
import { User, FileText, Users, Hospital } from "lucide-react";
import styles from "./page.module.css";

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

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "login";
  const supabase = createClient();
  const { user, loading: checkingAuth } = useClinic();
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [agreeChecked, setAgreeChecked] = useState(false);

  // ── GOOGLE LOGIN ──
  const handleGoogleLogin = async () => {
    if (!agreeChecked) return;
    setAuthError("");
    setAuthLoading(true);
    try {
      console.log("Auth: Initiating Google OAuth...");
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      console.error("Auth: Google error:", err);
      setAuthError(err.message || "Google authentication failed.");
      setAuthLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className={styles.loadingPage}>
        <div
          className="spinner"
          style={{
            width: "40px",
            height: "40px",
            borderTopColor: "#2E7D32",
          }}
        />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.overlay} />

      {/* Decorative Mobile Viewport SVGs */}
      <LeavesTopLeftMobile className={styles.leavesTopLeftMobile} />
      <LeavesBottomRightMobile className={styles.leavesBottomRightMobile} />

      <div className={styles.container}>
        {/* Left Side Content */}
        <div className={styles.leftPanel}>
          <LeavesLeftBottom className={styles.leavesLeftBottom} />
          
          <div className={styles.logoRow}>
            <Image
              src="/assets/jivora_care_logo.png"
              alt="Jivora Care Logo"
              width={54}
              height={54}
              style={{ objectFit: "contain" }}
            />
            <span className={styles.logoText}>Jivora Care</span>
          </div>

          <div className={styles.leftMainContent}>
            <h1>Advanced Clinic <br />Management Platform</h1>
            <div className={styles.horizontalLine} />
            <p className={styles.leftSubtext}>Everything you need to run your clinic smoothly.</p>
          </div>

          <div className={styles.featuresRow}>
            <div className={styles.featureIconBlock}>
              <div className={styles.iconCircleLeft}>
                <User size={22} strokeWidth={1.8} />
              </div>
              <span className={styles.featureLabel}>Patient Records</span>
            </div>
            <div className={styles.featureIconBlock}>
              <div className={styles.iconCircleLeft}>
                <FileText size={22} strokeWidth={1.8} />
              </div>
              <span className={styles.featureLabel}>Digital Prescriptions</span>
            </div>
            <div className={styles.featureIconBlock}>
              <div className={styles.iconCircleLeft}>
                <Users size={22} strokeWidth={1.8} />
              </div>
              <span className={styles.featureLabel}>Smart Queue</span>
            </div>
          </div>
        </div>

        {/* Right Side Auth Card */}
        <div className={styles.rightPanel}>
          <div className={styles.mobileLogoContainer}>
            <div className={styles.mobileLogoRow}>
              <Image
                src="/assets/jivora_care_logo.png"
                alt="Jivora Care Logo"
                width={42}
                height={42}
                style={{ objectFit: "contain" }}
              />
              <span className={styles.mobileLogoText}>Jivora Care</span>
            </div>
            <p className={styles.mobileLogoTagline}>Compassion. Care. Connected.</p>
          </div>

          <main className={styles.authCard}>
            <LeavesBranch className={styles.leavesCardCorner} />
            
            <div className={styles.panelContent}>
              <div className={styles.logoCircle}>
                <Hospital size={28} className={styles.hospitalIcon} />
              </div>

              <h2 className={styles.cardHeading}>
                {tab === "register" ? "Create your Account" : "Welcome back, Doctor!"}
              </h2>

              <div className={styles.heartSeparator}>
                <span className={styles.separatorLine} />
                <span className={styles.heartIcon}>💚</span>
                <span className={styles.separatorLine} />
              </div>

              <p className={styles.cardSubtext}>
                {tab === "register"
                  ? "Register a new account using your Google account."
                  : "Sign in or create a new account using your Google account."}
              </p>

              {authError && <div className={styles.errorBox}>{authError}</div>}

              <button
                type="button"
                onClick={handleGoogleLogin}
                className={styles.googleBtn}
                disabled={authLoading || !agreeChecked}
              >
                {authLoading ? (
                  <span
                    className="spinner"
                    style={{
                      width: "20px",
                      height: "20px",
                      borderTopColor: "#ffffff",
                    }}
                  />
                ) : (
                  <>
                    <svg viewBox="0 0 48 48" width="20" height="20" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '10px' }}>
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                      <path fill="#4285F4" d="M46.5 24c0-1.55-.15-3.24-.47-4.5H24v9h12.75C35.2 31.84 32.83 34 29.84 35.63l7.98 6.19C42.5 37.84 46.5 31.62 46.5 24z"/>
                      <path fill="#34A853" d="M24 38.5c-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48c6.47 0 11.93-2.13 15.89-5.81l-7.9-6.12C29.93 37.56 27.15 38.5 24 38.5z"/>
                      <path fill="#FBBC05" d="M10.54 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.98-6.19z"/>
                    </svg>
                    {tab === "register" ? "Sign up with Google" : "Continue with Google"}
                  </>
                )}
              </button>

              <div className={styles.consentTermsCheckbox}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={agreeChecked}
                    onChange={(e) => setAgreeChecked(e.target.checked)}
                    className={styles.checkboxInput}
                  />
                  <span className={styles.checkboxText}>
                    I agree to the <Link href="/terms" className={styles.blueLink}>Terms of Service</Link> and <Link href="/privacy" className={styles.blueLink}>Privacy Policy</Link>
                  </span>
                </label>
              </div>

              <div className={styles.toggleTextRow}>
                {tab === "register" ? (
                  <span>
                    Already have an account?{" "}
                    <Link href="/auth?tab=login" className={styles.blueLink}>
                      Sign in &gt;
                    </Link>
                  </span>
                ) : (
                  <span>
                    New to Jivora Care?{" "}
                    <Link href="/auth?tab=register" className={styles.blueLink}>
                      Create an account &gt;
                    </Link>
                  </span>
                )}
              </div>

              <div className={styles.heartSeparatorGrey}>
                <span className={styles.separatorLine} />
                <span className={styles.heartIconGrey}>❤</span>
                <span className={styles.separatorLine} />
              </div>

              <footer className={styles.footerLinks}>
                <Link href="/privacy">Privacy Policy</Link>
                <span className={styles.dotSeparator}>•</span>
                <Link href="/terms">Terms of Service</Link>
                <span className={styles.dotSeparator}>•</span>
                <Link href="/support">Contact Support</Link>
              </footer>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthPageContent />
    </Suspense>
  );
}
