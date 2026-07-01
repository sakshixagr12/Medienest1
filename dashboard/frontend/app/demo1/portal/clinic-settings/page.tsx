"use client";

import { useState, useEffect } from "react";
import {
  Building,
  MapPin,
  UserPlus,
  Users,
  ShieldCheck,
  Save,
  Stethoscope,
  Award,
  ChevronLeft,
  Phone,
  Calendar,
  FileText,
  Link as LinkIcon,
  Trash2,
  CreditCard,
  Check,
  Zap,
  AlertTriangle,
  Clock,
} from "lucide-react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { useClinic } from "@/context/ClinicContext";
import { createClient } from "@/lib/supabase/client";
import { normalizeDoctorName } from "@/lib/utils";
import { API_BASE_URL, authenticatedFetch } from "@/lib/api";
import { load } from "@cashfreepayments/cashfree-js";
import styles from "./page.module.css";

export default function ClinicSettingsPage() {
  const { clinic, doctors, refresh } = useClinic();
  const supabase = createClient();

  // Clinic States
  const [clinicName, setClinicName] = useState("");
  const [clinicAddress, setClinicAddress] = useState("");
  const [isSavingClinic, setIsSavingClinic] = useState(false);

  // Add Doctor States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newDocName, setNewDocName] = useState("");
  const [newDocSpecialty, setNewDocSpecialty] = useState("");
  const [newDocQual, setNewDocQual] = useState("");
  const [newDocContact, setNewDocContact] = useState("");
  const [newDocRegNumber, setNewDocRegNumber] = useState("");
  const [newDocExpiry, setNewDocExpiry] = useState("");
  const [newDocPhoto, setNewDocPhoto] = useState("");
  const [isAddingDoc, setIsAddingDoc] = useState(false);

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

  // Dynamic doctor limits
  let maxAllowedDoctors = 2;
  if (subscription) {
    if (subscription.plan_name === "Clinic") {
      maxAllowedDoctors = 5;
    } else if (subscription.plan_name === "Professional") {
      maxAllowedDoctors = 999;
    }
  }

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
      alert("Clinic settings updated successfully!");
    } catch (e: any) {
      alert("Error updating clinic: " + e.message);
    } finally {
      setIsSavingClinic(false);
    }
  };

  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinic?.id) return;
    if (doctors && doctors.length >= maxAllowedDoctors) {
      alert(`Clinic Limit Reached: Maximum ${maxAllowedDoctors} doctors allowed on your current plan.`);
      return;
    }

    setIsAddingDoc(true);
    try {
      const normalizedName = normalizeDoctorName(newDocName);
      const { data: newDoc, error: docErr } = await supabase
        .from("doctors")
        .insert([
          {
            name: normalizedName,
            specialty: newDocSpecialty || "General Consultant",
            qualification: newDocQual,
            contact: newDocContact.trim(),
            registration_number: newDocRegNumber.trim(),
            license_expiry_date: newDocExpiry || null,
            profile_photo_url: newDocPhoto.trim() || null,
          },
        ])
        .select()
        .single();

      if (docErr) throw docErr;

      const { error: mapErr } = await supabase.from("clinic_doctors").insert([
        {
          clinic_id: clinic.id,
          doctor_id: newDoc.id,
          is_active: true,
        },
      ]);

      if (mapErr) throw mapErr;

      setNewDocName("");
      setNewDocSpecialty("");
      setNewDocQual("");
      setNewDocContact("");
      setNewDocRegNumber("");
      setNewDocExpiry("");
      setNewDocPhoto("");
      setIsAddModalOpen(false);
      refresh();
      alert(`Dr. ${normalizedName} added to the clinic staff!`);
    } catch (e: any) {
      alert("Error adding doctor: " + e.message);
    } finally {
      setIsAddingDoc(false);
    }
  };

  const handleDeleteDoctor = async (clinicDoctorId: string, doctorName: string) => {
    if (!(await window.confirm(`Are you sure you want to remove Dr. ${doctorName} from this clinic?`))) {
      return;
    }
    try {
      const { error } = await supabase
        .from("clinic_doctors")
        .delete()
        .eq("id", clinicDoctorId);

      if (error) throw error;
      refresh();
      alert(`Dr. ${doctorName} has been removed.`);
    } catch (e: any) {
      alert("Error removing doctor: " + e.message);
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
        returnUrl: `${window.location.origin}/demo1/portal/clinic-settings?order_id=${data.order_id}`,
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
          <h1>Clinic Management</h1>
          <p>Update branding, subscription plan, and manage your medical staff</p>
        </div>
      </div>

      {showExpiredWarning && (
        <div className={styles.warningBanner}>
          <AlertTriangle size={18} />
          <span>Your 14-day trial or subscription has expired. Please choose a plan and subscribe to restore access.</span>
        </div>
      )}

      <div className={styles.grid}>
        {/* Left Column: Clinic Profile & Subscription */}
        <div className={styles.leftColumn}>
          {/* Clinic Branding */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.iconBox}>
                <Building size={20} />
              </div>
              <h3>Clinic Branding</h3>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.field}>
                <label>
                  <ShieldCheck size={14} /> Official Clinic Name
                </label>
                <input
                  type="text"
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                  placeholder="e.g. City Care Hospital"
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
                {isSavingClinic ? "Saving..." : "Update Clinic Profile"}
              </button>
            </div>
          </div>

          {/* Ward Management Card */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.iconBox}>
                <Building size={20} />
              </div>
              <h3>Hospital Infrastructure</h3>
            </div>
            <div className={styles.cardBody}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 600, color: "#1e293b", fontSize: 15, marginBottom: 4 }}>
                    Ward Management
                  </div>
                  <div style={{ color: "#64748b", fontSize: 13, paddingRight: 16 }}>
                    Configure hospital wards, beds, and manage facility capacity.
                  </div>
                </div>
                <div style={{ display: "flex", gap: "12px" }}>
                  <Link 
                    href="/demo1/portal/ward-management" 
                    style={{
                      background: "#f1f5f9",
                      color: "#3b82f6",
                      padding: "8px 16px",
                      borderRadius: "6px",
                      textDecoration: "none",
                      fontWeight: 600,
                      fontSize: 13,
                      border: "1px solid #e2e8f0",
                      whiteSpace: "nowrap"
                    }}
                  >
                    Manage Wards →
                  </Link>
                  <Link 
                    href="/demo1/portal/bed-management" 
                    style={{
                      background: "#f8fafc",
                      color: "#64748b",
                      padding: "8px 16px",
                      borderRadius: "6px",
                      textDecoration: "none",
                      fontWeight: 600,
                      fontSize: 13,
                      border: "1px solid #cbd5e1",
                      whiteSpace: "nowrap"
                    }}
                  >
                    Manage Beds →
                  </Link>
                </div>
              </div>
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
                      <Check size={14} className={styles.featureCheck} /> Max 2 Doctors
                    </li>
                    <li>
                      <Check size={14} className={styles.featureCheck} /> Patient Queue Manager
                    </li>
                    <li>
                      <Check size={14} className={styles.featureCheck} /> Basic AI summary metrics
                    </li>
                  </>
                )}
                {selectedPlan === "Clinic" && (
                  <>
                    <li>
                      <Check size={14} className={styles.featureCheck} /> Max 5 Doctors
                    </li>
                    <li>
                      <Check size={14} className={styles.featureCheck} /> Patient Queue & Analytics
                    </li>
                    <li>
                      <Check size={14} className={styles.featureCheck} /> Multi-language prescriptions
                    </li>
                    <li>
                      <Check size={14} className={styles.featureCheck} /> Priority Email Support
                    </li>
                  </>
                )}
                {selectedPlan === "Professional" && (
                  <>
                    <li>
                      <Check size={14} className={styles.featureCheck} /> Unlimited Doctors
                    </li>
                    <li>
                      <Check size={14} className={styles.featureCheck} /> Full Queue, billing & analytics
                    </li>
                    <li>
                      <Check size={14} className={styles.featureCheck} /> Custom branding & prescription logos
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

        {/* Right: Staff Management */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.iconBox}>
              <Users size={20} />
            </div>
            <h3>Medical Staff</h3>
            <span className={styles.countBadge}>
              {doctors?.length || 0} / {maxAllowedDoctors === 999 ? "∞" : maxAllowedDoctors}
            </span>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.docList}>
              {doctors?.map((doc) => (
                <div key={doc.id} className={styles.docItem}>
                  <div className={styles.docAvatar}>
                    {doc.name?.[0].toUpperCase()}
                  </div>
                  <div className={styles.docInfo}>
                    <h4>Dr. {doc.name}</h4>
                    <p>
                      {doc.specialty} • {doc.qualification}
                    </p>
                  </div>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => handleDeleteDoctor(doc.id, doc.name)}
                    title="Remove Doctor"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
              {(!doctors || doctors.length === 0) && (
                <p className={styles.emptyText}>No doctors added yet.</p>
              )}
            </div>

            <button
              className={styles.addBtn}
              onClick={() => setIsAddModalOpen(true)}
              disabled={doctors && doctors.length >= maxAllowedDoctors}
            >
              <UserPlus size={18} />
              Add New Doctor
            </button>
            {doctors && doctors.length >= maxAllowedDoctors && (
              <p className={styles.limitText}>
                Limit reached. Upgrade your plan to add more doctors.
              </p>
            )}
          </div>
        </div>
      </div>

      {isAddModalOpen && (
        <div
          className={styles.modalOverlay}
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3>Add New Doctor</h3>
              <button
                className={styles.closeBtn}
                onClick={() => setIsAddModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddDoctor} className={styles.modalBody}>
              <div className={styles.field}>
                <label>
                  <Building size={14} /> Full Name (without Dr. prefix)
                </label>
                <input
                  type="text"
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  required
                />
              </div>
              <div className={styles.field}>
                <label>
                  <Stethoscope size={14} /> Specialty
                </label>
                <input
                  type="text"
                  value={newDocSpecialty}
                  onChange={(e) => setNewDocSpecialty(e.target.value)}
                  placeholder="e.g. Cardiologist"
                  required
                />
              </div>
              <div className={styles.field}>
                <label>
                  <Award size={14} /> Qualification
                </label>
                <input
                  type="text"
                  value={newDocQual}
                  onChange={(e) => setNewDocQual(e.target.value)}
                  placeholder="e.g. MBBS, MD"
                  required
                />
              </div>
              <div className={styles.field}>
                <label>
                  <Phone size={14} /> Contact Number
                </label>
                <input
                  type="text"
                  value={newDocContact}
                  onChange={(e) => setNewDocContact(e.target.value)}
                  placeholder="e.g. 9876543210"
                />
              </div>
              <div className={styles.field}>
                <label>
                  <FileText size={14} /> Medical License No. <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  value={newDocRegNumber}
                  onChange={(e) => setNewDocRegNumber(e.target.value)}
                  placeholder="e.g. MCI-12345"
                  required
                />
              </div>
              <div className={styles.field}>
                <label>
                  <Calendar size={14} /> License Expiry Date
                </label>
                <input
                  type="date"
                  value={newDocExpiry}
                  onChange={(e) => setNewDocExpiry(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label>
                  <LinkIcon size={14} /> Profile Photo URL
                </label>
                <input
                  type="text"
                  value={newDocPhoto}
                  onChange={(e) => setNewDocPhoto(e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                />
              </div>
              <button
                type="submit"
                className={styles.modalAddBtn}
                disabled={isAddingDoc}
              >
                {isAddingDoc ? "Adding..." : "Confirm Registration"}
              </button>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
