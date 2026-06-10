"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { API_BASE_URL } from "@/lib/api";
import { load } from "@cashfreepayments/cashfree-js";
import { Hospital, AlertTriangle, Check, Loader2, CheckCircle2, LogOut, Zap } from "lucide-react";
import styles from "./page.module.css";

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

function PricingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [clinic, setClinic] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [showExpired, setShowExpired] = useState(false);

  // 1. Fetch clinic details & verify URL order status
  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        let user = session?.user || null;
        if (!user) {
          const { data: { user: verifiedUser } } = await supabase.auth.getUser();
          user = verifiedUser;
        }

        if (!user) {
          router.replace("/auth");
          return;
        }

        const { data: userClinic } = await supabase
          .from("clinics")
          .select("*")
          .eq("owner_user_id", user.id)
          .maybeSingle();

        if (!userClinic) {
          router.replace("/onboarding");
          return;
        }

        setClinic(userClinic);

        // If clinic is already active and there is no order_id to verify, redirect immediately
        const orderId = searchParams.get("order_id");
        if (userClinic.status === "active" && !orderId) {
          const dest = userClinic.clinic_type === "store" ? "/store" : "/portal";
          router.replace(dest);
          return;
        }

        if (searchParams.get("expired") === "true") {
          setShowExpired(true);
        }

        if (orderId) {
          // Clean URL params and verify
          window.history.replaceState({}, document.title, window.location.pathname);
          await verifyPaymentOnServer(orderId, userClinic);
        }
      } catch (err: any) {
        console.error("Initialization error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [searchParams]);

  // 2. Server-side verification
  const verifyPaymentOnServer = async (orderId: string, currentClinic: any) => {
    setVerifying(true);
    setPaymentError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API_BASE_URL}/api/payment/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ order_id: orderId, clinic_id: currentClinic.id }),
      });

      const data = await res.json();
      if (data.success && data.order_status === "PAID") {
        setVerificationSuccess(true);
        const dest = currentClinic.clinic_type === "store" ? "/store" : "/portal";
        setTimeout(() => {
          window.location.href = dest;
        }, 1800);
      } else {
        setPaymentError(data.error || "Payment verification pending or failed. Please check your bank statement.");
        setVerifying(false);
      }
    } catch (e: any) {
      setPaymentError("Network error during payment verification: " + e.message);
      setVerifying(false);
    }
  };

  // 3. Start 7-Day Free Trial
  const handleStartTrial = async (planName: string) => {
    if (processingPlan) return;
    setProcessingPlan(planName);
    setPaymentError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API_BASE_URL}/api/payment/start-trial`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          clinic_id: clinic.id,
          plan_name: planName
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to initiate free trial.");
      }

      setVerificationSuccess(true);
      const dest = clinic.clinic_type === "store" ? "/store" : "/portal";
      setTimeout(() => {
        window.location.href = dest;
      }, 1500);
    } catch (err: any) {
      setPaymentError(err.message || "An error occurred starting your free trial.");
      setProcessingPlan(null);
    }
  };

  // 4. Initiate Cashfree checkout SDK
  const handlePayCheckout = async (planName: string) => {
    if (processingPlan) return;
    setProcessingPlan(planName);
    setPaymentError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API_BASE_URL}/api/payment/create-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          clinic_id: clinic.id,
          plan_name: planName
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to initiate payment checkout.");
      }

      // Initialize Cashfree PG SDK
      const cashfree = await load({
        mode: process.env.NEXT_PUBLIC_CASHFREE_ENV === "production" ? "production" : "sandbox",
      });

      const checkoutOptions = {
        paymentSessionId: data.payment_session_id,
        returnUrl: `${window.location.origin}/pending?order_id=${data.order_id}`,
      };

      await cashfree.checkout(checkoutOptions);
    } catch (err: any) {
      setPaymentError(err.message || "Payment initialization failed.");
      setProcessingPlan(null);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/auth");
  };

  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <div className="spinner" style={{ width: "40px", height: "40px", borderTopColor: "#2E7D32" }} />
      </div>
    );
  }

  // 5. Verification Transition Overlay Screen
  if (verifying || verificationSuccess) {
    return (
      <div className={styles.verifyingOverlay}>
        <div className={styles.verifyingCard}>
          {verificationSuccess ? (
            <div className={styles.successWrapper}>
              <CheckCircle2 className={styles.successIcon} size={64} />
              <h2>Payment Successful!</h2>
              <p>Your subscription is active. Redirecting to your dashboard...</p>
            </div>
          ) : (
            <div className={styles.verifyingWrapper}>
              <Loader2 className={styles.verifyingSpinner} size={64} />
              <h2>Verifying Payment...</h2>
              <p>Please do not close, refresh, or navigate away from this page.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const isStore = clinic?.clinic_type === "store";

  return (
    <div className={styles.bg}>
      <LeavesBackground className={styles.leavesBgTop} />
      <LeavesBackground className={styles.leavesBgBottom} />

      <div className={styles.container}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.logoRow}>
            <Hospital size={28} className={styles.logoIcon} />
            <span className={styles.logoText}>MedieNest</span>
          </div>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            <LogOut size={16} /> Sign Out
          </button>
        </header>

        {/* Title */}
        <div className={styles.titleArea}>
          {showExpired ? (
            <div className={styles.expiredBanner}>
              <AlertTriangle className={styles.bannerWarningIcon} size={20} />
              <span>Your trial or subscription has expired. Please select a plan below to renew access.</span>
            </div>
          ) : (
            <span className={styles.badge}>Account Created</span>
          )}
          <h1>Choose your subscription plan</h1>
          <p>Get started with a 7-day free trial or subscribe to a plan to access patient queue management, electronic prescriptions, and clinic reports.</p>
        </div>

        {paymentError && (
          <div className={styles.errorBanner}>
            <AlertTriangle size={18} />
            <span>{paymentError}</span>
          </div>
        )}

        {/* Pricing Cards Grid */}
        <div className={styles.pricingGrid}>
          {/* Plan 1: Starter */}
          <div className={styles.pricingCard}>
            <div className={styles.cardHeader}>
              <span className={styles.planName}>Starter</span>
              <div className={styles.priceRow}>
                <span className={styles.currency}>₹</span>
                <span className={styles.amount}>99</span>
                <span className={styles.period}>/month</span>
              </div>
            </div>
            <div className={styles.divider} />
            <ul className={styles.featuresList}>
              {isStore ? (
                <>
                  <li><Check size={16} /> Basic Billing & Receipts</li>
                  <li><Check size={16} /> Day Sales Summary</li>
                  <li><Check size={16} /> Standard Email Support</li>
                </>
              ) : (
                <>
                  <li><Check size={16} /> Max 2 Consulting Doctors</li>
                  <li><Check size={16} /> Patient Queue Manager</li>
                  <li><Check size={16} /> Basic AI summary metrics</li>
                </>
              )}
            </ul>
            <div className={styles.buttonCol}>
              <button
                className={styles.trialBtn}
                onClick={() => handleStartTrial("Starter")}
                disabled={!!processingPlan}
              >
                {processingPlan === "Starter" ? <Loader2 className={styles.spin} size={18} /> : "Start 7-Day Free Trial"}
              </button>
              <button
                className={styles.payBtn}
                onClick={() => handlePayCheckout("Starter")}
                disabled={!!processingPlan}
              >
                <Zap size={15} style={{ marginRight: "6px" }} />
                Subscribe Now
              </button>
            </div>
          </div>

          {/* Plan 2: Clinic */}
          <div className={`${styles.pricingCard} ${styles.featuredCard}`}>
            <div className={styles.popularTag}>MOST POPULAR</div>
            <div className={styles.cardHeader}>
              <span className={styles.planName} style={{ color: "#2E7D32" }}>Clinic</span>
              <div className={styles.priceRow}>
                <span className={styles.currency}>₹</span>
                <span className={styles.amount}>249</span>
                <span className={styles.period}>/month</span>
              </div>
            </div>
            <div className={styles.divider} />
            <ul className={styles.featuresList}>
              {isStore ? (
                <>
                  <li><Check size={16} /> Advanced Billing & Reports</li>
                  <li><Check size={16} /> Analytics & Insights</li>
                  <li><Check size={16} /> Priority Email Support</li>
                </>
              ) : (
                <>
                  <li><Check size={16} /> Max 5 Consulting Doctors</li>
                  <li><Check size={16} /> Patient Queue & Analytics</li>
                  <li><Check size={16} /> Multi-language prescriptions</li>
                  <li><Check size={16} /> Priority Email Support</li>
                </>
              )}
            </ul>
            <div className={styles.buttonCol}>
              <button
                className={`${styles.trialBtn} ${styles.featuredTrialBtn}`}
                onClick={() => handleStartTrial("Clinic")}
                disabled={!!processingPlan}
              >
                {processingPlan === "Clinic" ? <Loader2 className={styles.spin} size={18} /> : "Start 7-Day Free Trial"}
              </button>
              <button
                className={`${styles.payBtn} ${styles.featuredPayBtn}`}
                onClick={() => handlePayCheckout("Clinic")}
                disabled={!!processingPlan}
              >
                <Zap size={15} style={{ marginRight: "6px" }} />
                Subscribe Now
              </button>
            </div>
          </div>

          {/* Plan 3: Professional */}
          <div className={styles.pricingCard}>
            <div className={styles.cardHeader}>
              <span className={styles.planName}>Professional</span>
              <div className={styles.priceRow}>
                <span className={styles.currency}>₹</span>
                <span className={styles.amount}>499</span>
                <span className={styles.period}>/month</span>
              </div>
            </div>
            <div className={styles.divider} />
            <ul className={styles.featuresList}>
              {isStore ? (
                <>
                  <li><Check size={16} /> Unlimited Billing & Invoices</li>
                  <li><Check size={16} /> Custom branding & receipt logos</li>
                  <li><Check size={16} /> Dedicated Account Manager</li>
                </>
              ) : (
                <>
                  <li><Check size={16} /> Unlimited Doctors</li>
                  <li><Check size={16} /> Full Queue, billing & analytics</li>
                  <li><Check size={16} /> Custom branding & prescription logos</li>
                  <li><Check size={16} /> Dedicated Account Manager</li>
                </>
              )}
            </ul>
            <div className={styles.buttonCol}>
              <button
                className={styles.trialBtn}
                onClick={() => handleStartTrial("Professional")}
                disabled={!!processingPlan}
              >
                {processingPlan === "Professional" ? <Loader2 className={styles.spin} size={18} /> : "Start 7-Day Free Trial"}
              </button>
              <button
                className={styles.payBtn}
                onClick={() => handlePayCheckout("Professional")}
                disabled={!!processingPlan}
              >
                <Zap size={15} style={{ marginRight: "6px" }} />
                Subscribe Now
              </button>
            </div>
          </div>
        </div>

        {/* Footer Support Info */}
        <footer className={styles.footer}>
          <p>Secure payments processed via Cashfree. Having issues? <a href="mailto:support@medienest.care">Contact Support</a></p>
        </footer>
      </div>
    </div>
  );
}

export default function PendingPage() {
  return (
    <Suspense fallback={
      <div className={styles.loadingScreen}>
        <div className="spinner" style={{ width: "40px", height: "40px", borderTopColor: "#2E7D32" }} />
      </div>
    }>
      <PricingPageContent />
    </Suspense>
  );
}
