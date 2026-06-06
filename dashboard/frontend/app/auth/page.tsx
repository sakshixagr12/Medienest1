"use client";

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useClinic } from "@/context/ClinicContext";
import styles from "./page.module.css";

function AuthPageContent() {
  const router = useRouter();
  const supabase = createClient();
  const { user, loading: checkingAuth } = useClinic();
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // ── GOOGLE LOGIN ──
  const handleGoogleLogin = async () => {
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
      <div className={styles.page}>
        <div
          className="spinner"
          style={{
            width: "40px",
            height: "40px",
            borderTopColor: "var(--sanctuary-primary)",
          }}
        />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={`${styles.bgDecoration} ${styles.decorTop}`} />
      <div className={`${styles.bgDecoration} ${styles.decorBottom}`} />

      <Link href="/" className={styles.backHome}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
        Home
      </Link>

      <div className={styles.authContainer}>
        <main className={styles.authCard}>
          <div className={styles.panelContent}>
            <header className={styles.brandHeader}>
              <div className={styles.logoCircle}>
                <Image
                  src="/assets/jirova_care_logo.png"
                  alt="Jirova Care Logo"
                  width={48}
                  height={48}
                  style={{ objectFit: "contain" }}
                />
              </div>
              <h1>Jirova Care</h1>
              <p>Advanced Clinic Management Platform</p>
            </header>

            <div className={styles.welcomeInfo}>
              <h2>Welcome to practitioner portal</h2>
              <p>
                Sign in or create a new account using your Google account to
                manage your patients, clinical queues, and AI recommendations.
              </p>
            </div>

            {authError && <div className={styles.errorBox}>{authError}</div>}

            <button
              type="button"
              onClick={handleGoogleLogin}
              className={styles.googleBtn}
              disabled={authLoading}
            >
              {authLoading ? (
                <span
                  className="spinner"
                  style={{
                    width: "20px",
                    height: "20px",
                    borderTopColor: "var(--sanctuary-primary)",
                  }}
                />
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continue with Google
                </>
              )}
            </button>

            <div className={styles.consentTerms}>
              By continuing, you agree to our{" "}
              <Link href="#">Terms of Service</Link> and{" "}
              <Link href="#">Privacy Policy</Link>.
            </div>
          </div>
        </main>

        <footer className={styles.footerLinks}>
          <Link href="#">Privacy Policy</Link>
          <Link href="#">Terms of Service</Link>
          <Link href="#">Contact Support</Link>
        </footer>
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
