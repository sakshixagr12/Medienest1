"use client";

import { useState, useEffect } from "react";
import {
  Building,
  MapPin,
  ShieldCheck,
  Save,
  CreditCard,
  Check,
  Zap,
  AlertTriangle,
  Clock,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useClinic } from "@/context/ClinicContext";
import { createClient } from "@/lib/supabase/client";
import { API_BASE_URL, authenticatedFetch } from "@/lib/api";
import { load } from "@cashfreepayments/cashfree-js";
import styles from "./page.module.css";

export default function ClinicSettingsPage() {
  const { clinic, refresh } = useClinic();
  const supabase = createClient();

  // Store States
  const [clinicName, setClinicName] = useState("");
  const [clinicAddress, setClinicAddress] = useState("");
  const [isSavingClinic, setIsSavingClinic] = useState(false);

  // Subscription States
  const [subscription, setSubscription] = useState<any>(null);
  const [isLoadingSub, setIsLoadingSub] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState("Starter");
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [showExpiredWarning, setShowExpiredWarning] = useState(false);

  // Fetch subscription details
  const fetchSubscription = async () => {
    if (!clinic?.id) return;
    setIsLoadingSub(true);
    try {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("clinic_id", clinic.id)
        .maybeSingle();

      if (error) throw error;
      setSubscription(data);
    } catch (e: any) {
      console.error("Error fetching subscription:", e.message);
    } finally {
      setIsLoadingSub(false);
    }
  };

  // Verify payment on the server
  const verifyPaymentOnServer = async (orderId: string) => {
    if (!clinic?.id) return;
    setIsCheckingOut(true);
    try {
      const res = await authenticatedFetch(`${API_BASE_URL}/api/payment/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clinic_id: clinic.id,
          order_id: orderId,
        }),
      });
      const data = await res.json();
      if (data.success && data.order_status === "PAID") {
        alert("Payment verified! Your subscription is now active.");
        await fetchSubscription();
      } else {
        alert("Verification status: " + (data.error || "Payment not verified yet. Please try again."));
      }
    } catch (e: any) {
      alert("Error verifying payment: " + e.message);
    } finally {
      setIsCheckingOut(false);
    }
  };

  // Run initial loading of settings and verify check
  useEffect(() => {
    if (clinic) {
      setClinicName(clinic.name || "");
      setClinicAddress(clinic.address || "");
      fetchSubscription();

      // Check if redirected back with an order_id
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const orderId = params.get("order_id");
        if (orderId) {
          // Clean parameters from URL
          window.history.replaceState({}, document.title, window.location.pathname);
          verifyPaymentOnServer(orderId);
        }
        if (params.get("expired") === "true") {
          setShowExpiredWarning(true);
        }
      }
    }
  }, [clinic]);

  // Determine trial details
  const getTrialDetails = () => {
    if (!clinic?.created_at) return { active: false, daysLeft: 0, expired: true };
    const createdAt = new Date(clinic.created_at);
    const trialEnd = new Date(createdAt);
    trialEnd.setDate(trialEnd.getDate() + 14);

    const today = new Date();
    const isExpired = today >= trialEnd;
    const diffTime = trialEnd.getTime() - today.getTime();
    const daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    return {
      active: !isExpired,
      daysLeft,
      expired: isExpired,
      endDateStr: trialEnd.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    };
  };

  const trial = getTrialDetails();

  const handleSaveClinic = async () => {
    if (!clinic?.id) return;
    setIsSavingClinic(true);
    try {
      const { error } = await supabase
        .from("clinics")
        .update({
          name: clinicName,
          address: clinicAddress,
        })
        .eq("id", clinic.id);

      if (error) throw error;
      refresh();
      alert("Store settings updated successfully!");
    } catch (e: any) {
      alert("Error updating store: " + e.message);
    } finally {
      setIsSavingClinic(false);
    }
  };

  // Initiate Cashfree checkout SDK
  const handleUpgradeCheckout = async () => {
    if (!clinic?.id) return;
    setIsCheckingOut(true);
    try {
      // 1. Get payment session ID from backend
      const res = await authenticatedFetch(`${API_BASE_URL}/api/payment/create-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clinic_id: clinic.id,
          plan_name: selectedPlan,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to initiate payment");
      }

      if (data.bypass) {
        alert("Subscription updated successfully!");
        window.location.reload();
        return;
      }

      // 2. Initialize Cashfree PG SDK
      const cashfree = await load({
        mode: process.env.NEXT_PUBLIC_CASHFREE_ENV === "production" ? "production" : "sandbox",
      });

      // 3. Open Checkout Overlay
      const checkoutOptions = {
        paymentSessionId: data.payment_session_id,
        returnUrl: `${window.location.origin}/store/clinic-settings?order_id=${data.order_id}`,
      };

      await cashfree.checkout(checkoutOptions);
    } catch (err: any) {
      alert("Checkout failed: " + err.message);
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <DashboardLayout hideSidebar>
      <div className={styles.header}>
        <div className={styles.headerText}>
          <h1>Store Management</h1>
          <p>Update branding, subscription plan, and billing details</p>
        </div>
      </div>

      {showExpiredWarning && (
        <div className={styles.warningBanner}>
          <AlertTriangle size={18} />
          <span>Your 14-day trial or subscription has expired. Please choose a plan and subscribe to restore access.</span>
        </div>
      )}

      <div className={styles.grid}>
        {/* Store Branding */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.iconBox}>
              <Building size={20} />
            </div>
            <h3>Store Branding</h3>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.field}>
              <label>
                <ShieldCheck size={14} /> Official Store Name
              </label>
              <input
                type="text"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                placeholder="e.g. City Meds Medical Store"
              />
            </div>
            <div className={styles.field}>
              <label>
                <MapPin size={14} /> Physical Address
              </label>
              <textarea
                rows={3}
                value={clinicAddress}
                onChange={(e) => setClinicAddress(e.target.value)}
                placeholder="e.g. 123 Healthcare Ave, Sector 4..."
              />
            </div>
            <button
              className={styles.saveBtn}
              onClick={handleSaveClinic}
              disabled={isSavingClinic}
            >
              <Save size={16} />
              {isSavingClinic ? "Saving..." : "Update Store Profile"}
            </button>
          </div>
        </div>

        {/* Subscription Card */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.iconBox}>
              <CreditCard size={20} />
            </div>
            <h3>Plan & Billing</h3>
          </div>
          <div className={styles.cardBody}>
            {/* Active Subscription Status Banner */}
            {subscription && subscription.status === "active" ? (
              <div className={`${styles.subStatusBox} ${styles.subActive}`}>
                <div className={styles.subStatusIcon}>
                  <Zap size={18} />
                </div>
                <div className={styles.subStatusText}>
                  <h4>Active: {subscription.plan_name} Tier</h4>
                  <p>
                    Expires/Renews on{" "}
                    {new Date(subscription.end_date).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            ) : trial.active ? (
              <div className={`${styles.subStatusBox} ${styles.trialActive}`}>
                <div className={styles.subStatusIcon}>
                  <Clock size={18} />
                </div>
                <div className={styles.subStatusText}>
                  <h4>14-Day Free Trial</h4>
                  <p>Expires in {trial.daysLeft} days ({trial.endDateStr})</p>
                </div>
              </div>
            ) : (
              <div className={`${styles.subStatusBox} ${styles.trialExpired}`}>
                <div className={styles.subStatusIcon}>
                  <AlertTriangle size={18} />
                </div>
                <div className={styles.subStatusText}>
                  <h4>Subscription / Trial Expired</h4>
                  <p>Upgrade to a paid plan below to restore access</p>
                </div>
              </div>
            )}

            {/* Pricing Tier Selector */}
            <h4 style={{ fontSize: "14px", fontWeight: "800", color: "#1e293b", margin: "16px 0 8px" }}>
              Select Subscription Tier
            </h4>

            <div className={styles.planTierList}>
              {/* Starter Plan */}
              <div
                className={`${styles.planTier} ${selectedPlan === "Starter" ? styles.planTierSelected : ""}`}
                onClick={() => setSelectedPlan("Starter")}
              >
                <input
                  type="radio"
                  className={styles.planRadio}
                  name="billing-plan"
                  checked={selectedPlan === "Starter"}
                  onChange={() => setSelectedPlan("Starter")}
                />
                <div className={styles.planTierInfo}>
                  <div className={styles.planTierName}>Starter Tier</div>
                  <div className={styles.planTierPrice}>₹99 / month</div>
                </div>
              </div>

              {/* Clinic Plan */}
              <div
                className={`${styles.planTier} ${selectedPlan === "Clinic" ? styles.planTierSelected : ""}`}
                onClick={() => setSelectedPlan("Clinic")}
              >
                <input
                  type="radio"
                  className={styles.planRadio}
                  name="billing-plan"
                  checked={selectedPlan === "Clinic"}
                  onChange={() => setSelectedPlan("Clinic")}
                />
                <div className={styles.planTierInfo}>
                  <div className={styles.planTierName}>Clinic Tier</div>
                  <div className={styles.planTierPrice}>₹249 / month</div>
                </div>
              </div>

              {/* Professional Plan */}
              <div
                className={`${styles.planTier} ${selectedPlan === "Professional" ? styles.planTierSelected : ""}`}
                onClick={() => setSelectedPlan("Professional")}
              >
                <input
                  type="radio"
                  className={styles.planRadio}
                  name="billing-plan"
                  checked={selectedPlan === "Professional"}
                  onChange={() => setSelectedPlan("Professional")}
                />
                <div className={styles.planTierInfo}>
                  <div className={styles.planTierName}>Professional Tier</div>
                  <div className={styles.planTierPrice}>₹499 / month</div>
                </div>
              </div>
            </div>

            {/* Tier Details list based on selectedPlan */}
            <ul className={styles.planFeatures}>
              {selectedPlan === "Starter" && (
                <>
                  <li>
                    <Check size={14} className={styles.featureCheck} /> Basic Billing & Receipts
                  </li>
                  <li>
                    <Check size={14} className={styles.featureCheck} /> Day Sales Summary
                  </li>
                  <li>
                    <Check size={14} className={styles.featureCheck} /> Standard Support
                  </li>
                </>
              )}
              {selectedPlan === "Clinic" && (
                <>
                  <li>
                    <Check size={14} className={styles.featureCheck} /> Advanced Billing & Reports
                  </li>
                  <li>
                    <Check size={14} className={styles.featureCheck} /> Analytics & Insights
                  </li>
                  <li>
                    <Check size={14} className={styles.featureCheck} /> Priority Email Support
                  </li>
                </>
              )}
              {selectedPlan === "Professional" && (
                <>
                  <li>
                    <Check size={14} className={styles.featureCheck} /> Unlimited Billing & Invoices
                  </li>
                  <li>
                    <Check size={14} className={styles.featureCheck} /> Custom branding & receipt logos
                  </li>
                  <li>
                    <Check size={14} className={styles.featureCheck} /> Dedicated account manager
                  </li>
                </>
              )}
            </ul>

            <button
              className={styles.saveBtn}
              onClick={handleUpgradeCheckout}
              disabled={isCheckingOut || (subscription?.plan_name === selectedPlan && subscription?.status === "active")}
            >
              <CreditCard size={16} />
              {isCheckingOut
                ? "Initializing payment..."
                : subscription?.plan_name === selectedPlan && subscription?.status === "active"
                ? "Current Plan"
                : `Pay & Activate Tier (₹${selectedPlan === "Starter" ? "99" : selectedPlan === "Clinic" ? "249" : "499"})`}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
