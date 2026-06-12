"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { API_BASE_URL } from "@/lib/api";
import { load } from "@cashfreepayments/cashfree-js";
import { Hospital, AlertTriangle, Check, Loader2, CheckCircle2, LogOut, Zap, Lock, Headphones, MessageSquare, ArrowRight, ShieldCheck } from "lucide-react";
import Image from "next/image";
import CountUp from "@/components/CountUp";
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
          router.replace("/demo/auth");
          return;
        }

        const { data: userClinic } = await supabase
          .from("clinics")
          .select("*")
          .eq("owner_user_id", user.id)
          .maybeSingle();

        if (!userClinic) {
          router.replace("/demo/onboarding");
          return;
        }

        setClinic(userClinic);

        // If clinic is already active and there is no order_id to verify, redirect immediately
        const orderId = searchParams.get("order_id");
        if (userClinic.status === "active" && !orderId) {
          const dest = userClinic.clinic_type === "store" ? "/demo/store" : "/demo/portal";
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
        const dest = currentClinic.clinic_type === "store" ? "/demo/store" : "/demo/portal";
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
      const dest = clinic.clinic_type === "store" ? "/demo/store" : "/demo/portal";
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

      if (data.bypass) {
        setVerificationSuccess(true);
        const dest = clinic.clinic_type === "store" ? "/demo/store" : "/demo/portal";
        setTimeout(() => {
          window.location.href = dest;
        }, 1500);
        return;
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
    router.replace("/demo/auth");
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
      {/* Background decorations */}
      <div className={styles.stethoscopeBgDecoration}>
        <Image
          src="/assets/stethoscope_bg.png"
          alt="Stethoscope Decoration"
          width={380}
          height={380}
          style={{ objectFit: 'contain', opacity: 0.65 }}
        />
      </div>
      <div className={styles.plantBgDecoration}>
        <Image
          src="/assets/plant_cross_bg.png"
          alt="Potted Plant Decoration"
          width={340}
          height={340}
          style={{ objectFit: 'contain', opacity: 0.85 }}
        />
      </div>

      {/* Floating Navigation Bar (Same style as PortalNavbar) */}
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

          <div className={styles.profileArea}>
            <div className={styles.avatarCircle}>
              {clinic?.name ? clinic.name.charAt(0).toUpperCase() : "M"}
            </div>
            <div className={styles.profileText}>
              <span className={styles.roleLabel}>{clinic?.name || "User"}</span>
              <button className={styles.signOutLink} onClick={handleLogout} aria-label="Sign Out">
                <span>Sign Out</span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={styles.signOutIcon}
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className={styles.container}>

        {/* Title */}
        <div className={styles.titleArea}>
          {showExpired ? (
            <div className={styles.expiredBanner}>
              <AlertTriangle className={styles.bannerWarningIcon} size={20} />
              <span>Your subscription has expired. Please select a plan below to renew access.</span>
            </div>
          ) : (
            <div className={styles.successBadge}>
              <Check size={14} style={{ marginRight: '6px' }} /> Account created successfully
            </div>
          )}
          <h1>
            Plans designed for care.<br />
            Built for <span className={styles.italicGreen}>{isStore ? "your store" : "your clinic"}.</span>
          </h1>
          <p>Subscribe anytime to streamline patient queue management, electronic prescriptions, and billing reports.</p>
        </div>

        {paymentError && (
          <div className={styles.errorBanner}>
            <AlertTriangle size={18} />
            <span>{paymentError}</span>
          </div>
        )}

        {/* Beta Alert Banner */}
        <div className={styles.betaAlertBanner}>
          🎉 All plans are currently at <strong style={{ fontWeight: 900, color: '#0d9488' }}><CountUp from={10} to={90} duration={1.2} startWhen={true} roundTo={10} />%</strong> off during our beta testing period.
        </div>

        {/* Pricing Cards Grid */}
        <div className={styles.pricingGrid}>
          {/* Plan 1: Starter */}
          <div className={styles.pricingCard}>
            <div className={styles.cardBgIllustration}>
              <Image
                src="/assets/3d_starter_clipboard.png"
                alt="Starter Clipboard Icon"
                width={140}
                height={140}
                className={styles.illustrationImg}
              />
            </div>

            <div className={styles.cardHeader}>
              <span className={styles.planName}>Starter</span>
              <p className={styles.planSubtitle}>{isStore ? "For solo stores/owners" : "Perfect for individual practitioners"}</p>
              <div className={styles.priceRow}>
                <span className={styles.priceOriginal}>₹999</span>
                <span className={styles.currency}>₹</span>
                <span className={styles.amount}>
                  <CountUp from={999} to={99} duration={1.2} startWhen={true} roundTo={10} />
                </span>
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
                className={styles.payBtn}
                onClick={() => handlePayCheckout("Starter")}
                disabled={!!processingPlan}
              >
                {processingPlan === "Starter" ? (
                  <Loader2 className={styles.spin} size={18} />
                ) : (
                  "Subscribe Now"
                )}
              </button>
            </div>
          </div>

          {/* Plan 2: Clinic */}
          <div className={`${styles.pricingCard} ${styles.featuredCard}`}>
            <div className={styles.popularTag}>★ MOST POPULAR</div>
            <div className={styles.cardBgIllustration}>
              <Image
                src="/assets/3d_clinic_monitor.png"
                alt="Clinic Monitor Icon"
                width={140}
                height={140}
                className={styles.illustrationImg}
              />
            </div>

            <div className={styles.cardHeader}>
              <span className={styles.planName} style={{ color: "#2E7D32" }}>Clinic</span>
              <p className={styles.planSubtitle}>{isStore ? "For active stores & groups" : "Ideal for growing clinics"}</p>
              <div className={styles.priceRow}>
                <span className={styles.priceOriginal}>₹2,499</span>
                <span className={styles.currency}>₹</span>
                <span className={styles.amount}>
                  <CountUp from={2499} to={249} duration={1.2} startWhen={true} roundTo={10} />
                </span>
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
                className={`${styles.payBtn} ${styles.featuredPayBtn}`}
                onClick={() => handlePayCheckout("Clinic")}
                disabled={!!processingPlan}
              >
                {processingPlan === "Clinic" ? (
                  <Loader2 className={styles.spin} size={18} />
                ) : (
                  "Subscribe Now"
                )}
              </button>
            </div>
          </div>

          {/* Plan 3: Professional */}
          <div className={styles.pricingCard}>
            <div className={styles.cardBgIllustration}>
              <Image
                src="/assets/3d_professional_bag.png"
                alt="Professional Bag Icon"
                width={140}
                height={140}
                className={styles.illustrationImg}
              />
            </div>

            <div className={styles.cardHeader}>
              <span className={styles.planName}>Professional</span>
              <p className={styles.planSubtitle}>{isStore ? "Unlimited multi-location stores" : "Advanced tools for your practice"}</p>
              <div className={styles.priceRow}>
                <span className={styles.priceOriginal}>₹4,999</span>
                <span className={styles.currency}>₹</span>
                <span className={styles.amount}>
                  <CountUp from={4999} to={499} duration={1.2} startWhen={true} roundTo={10} />
                </span>
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
                className={styles.payBtn}
                onClick={() => handlePayCheckout("Professional")}
                disabled={!!processingPlan}
              >
                {processingPlan === "Professional" ? (
                  <Loader2 className={styles.spin} size={18} />
                ) : (
                  "Subscribe Now"
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Trust Badges Grid Footer */}
        <div className={styles.trustGridContainer}>
          <div className={styles.trustItem}>
            <div className={styles.trustIconWrap}>
              <ShieldCheck size={24} className={styles.trustIcon} />
            </div>
            <div className={styles.trustTextWrap}>
              <h4>Secure & Encrypted</h4>
              <p>Your data is safe with us</p>
            </div>
          </div>
          <div className={styles.trustItemDivider} />
          <div className={styles.trustItem}>
            <div className={styles.trustIconWrap}>
              <Lock size={20} className={styles.trustIcon} />
            </div>
            <div className={styles.trustTextWrap}>
              <h4>PCI Compliant</h4>
              <p>Industry-standard security</p>
            </div>
          </div>
          <div className={styles.trustItemDivider} />
          <div className={styles.trustItem}>
            <div className={styles.trustIconWrap}>
              <Headphones size={22} className={styles.trustIcon} />
            </div>
            <div className={styles.trustTextWrap}>
              <h4>24/7 Support</h4>
              <p>We're here to help you</p>
            </div>
          </div>
          <div className={styles.trustItemDivider} />
          <div className={styles.trustItem}>
            <div className={styles.trustIconWrap}>
              <MessageSquare size={20} className={styles.trustIcon} />
            </div>
            <div className={styles.trustTextWrap}>
              <h4>Have questions?</h4>
              <a href="mailto:support@medienest.care" className={styles.contactSupportLink}>
                Contact Support <ArrowRight size={14} style={{ marginLeft: '4px' }} />
              </a>
            </div>
          </div>
        </div>
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
