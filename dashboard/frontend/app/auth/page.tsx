"use client";

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useClinic } from "@/context/ClinicContext";
import { User, FileText, Users, Hospital } from "lucide-react";
import styles from "./page.module.css";

function AuthPageContent() {
  const router = useRouter();
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
            borderTopColor: "#0d9488",
          }}
        />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.overlay} />

      <div className={styles.container}>
        {/* Left Side Content */}
        <div className={styles.leftPanel}>
          <div className={styles.logoRow}>
            <Image
              src="/assets/jirova_care_logo.png"
              alt="Jirova Care Logo"
              width={40}
              height={40}
              style={{ objectFit: "contain" }}
            />
            <span className={styles.logoText}>Jirova Care</span>
          </div>

          <div className={styles.leftMainContent}>
            <h1>Advanced Clinic <br />Management Platform</h1>
            <div className={styles.horizontalLine} />
            <p className={styles.leftSubtext}>Everything you need to run your clinic smoothly.</p>
          </div>

          <div className={styles.featuresRow}>
            <div className={styles.featureIconBlock}>
              <div className={styles.iconCircleLeft}>
                <User size={24} strokeWidth={2} />
              </div>
              <span className={styles.featureLabel}>Patient Records</span>
            </div>
            <div className={styles.featureIconBlock}>
              <div className={styles.iconCircleLeft}>
                <FileText size={24} strokeWidth={2} />
              </div>
              <span className={styles.featureLabel}>Digital Prescriptions</span>
            </div>
            <div className={styles.featureIconBlock}>
              <div className={styles.iconCircleLeft}>
                <Users size={24} strokeWidth={2} />
              </div>
              <span className={styles.featureLabel}>Smart Queue</span>
            </div>
          </div>
        </div>

        {/* Right Side Auth Card */}
        <div className={styles.rightPanel}>
          <main className={styles.authCard}>
            <div className={styles.panelContent}>
              <div className={styles.logoCircle}>
                <Hospital size={28} className={styles.hospitalIcon} />
              </div>

              <h2 className={styles.cardHeading}>Welcome back, Doctor!</h2>
              <p className={styles.cardSubtext}>
                Sign in or create a new account using your Google account.
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
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                      <path d="M12 2a10 10 0 0 1 8 4H12a4 4 0 0 0-4 4 4 4 0 0 0 4 4c2.2 0 4-1.8 4-4H12" fill="none" />
                      {/* Standard Google G symbol inline paths */}
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="currentColor" stroke="none" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="currentColor" stroke="none" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="currentColor" stroke="none" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="currentColor" stroke="none" />
                    </svg>
                    Continue with Google
                  </>
                )}
              </button>

              <div className={styles.dividerRow}>
                <div className={styles.dividerLine} />
                <span className={styles.dividerText}>or</span>
                <div className={styles.dividerLine} />
              </div>

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

              <footer className={styles.footerLinks}>
                <Link href="/privacy">Privacy Policy</Link>
                <Link href="/terms">Terms of Service</Link>
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
