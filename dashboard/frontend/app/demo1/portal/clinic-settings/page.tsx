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
  Activity,
  BedDouble,
  DoorOpen,
  Search,
  Settings,
  Mail,
  Hash
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

  // Clinic States (Enhanced)
  const [clinicName, setClinicName] = useState("");
  const [clinicAddress, setClinicAddress] = useState("");
  const [clinicPhone, setClinicPhone] = useState("");
  const [clinicEmail, setClinicEmail] = useState("");
  const [clinicRegNumber, setClinicRegNumber] = useState("");
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isSavingClinic, setIsSavingClinic] = useState(false);

  // Search Doctor
  const [docSearchQuery, setDocSearchQuery] = useState("");

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
  
  // Infrastructure Stats
  const [infraStats, setInfraStats] = useState({
    wards: 0,
    totalBeds: 0,
    occupiedBeds: 0,
    availableBeds: 0,
    occupancyRate: "0%"
  });

  const fetchInfraStats = async () => {
    try {
      const { data: wardsData } = await supabase.from("wards").select("id, is_active");
      const { data: bedsData } = await supabase.from("beds").select("id, status");

      const activeWards = (wardsData || []).filter((w: any) => w.is_active).length;
      const totalBeds = (bedsData || []).length;
      const occupiedBeds = (bedsData || []).filter((b: any) => b.status === "Occupied").length;
      const availableBeds = (bedsData || []).filter((b: any) => b.status === "Available").length;
      const occupancyRate = totalBeds > 0 ? ((occupiedBeds / totalBeds) * 100).toFixed(1) + "%" : "0%";

      setInfraStats({
        wards: activeWards,
        totalBeds,
        occupiedBeds,
        availableBeds,
        occupancyRate
      });
    } catch (e) {
      console.error("Error fetching infra stats", e);
    }
  };

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
      // Mocked additional fields
      setClinicPhone("+91 98765 43210");
      setClinicEmail("contact@hospital.com");
      setClinicRegNumber("MCI-H-998877");
      
      fetchSubscription();
      fetchInfraStats();

      // Check if redirected back with an order_id
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const orderId = params.get("order_id");
        if (orderId) {
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

  const filteredDoctors = doctors?.filter(d => 
    d.name.toLowerCase().includes(docSearchQuery.toLowerCase()) || 
    d.specialty?.toLowerCase().includes(docSearchQuery.toLowerCase())
  );

  const handleSaveClinic = async (e: React.FormEvent) => {
    e.preventDefault();
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
      setIsEditProfileOpen(false);
      alert("Clinic profile updated successfully!");
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
      alert(`Dr. ${normalizedName} added to the hospital staff!`);
    } catch (e: any) {
      alert("Error adding doctor: " + e.message);
    } finally {
      setIsAddingDoc(false);
    }
  };

  const handleDeleteDoctor = async (clinicDoctorId: string, doctorName: string) => {
    if (!(await window.confirm(`Are you sure you want to remove Dr. ${doctorName} from this hospital?`))) {
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
      const res = await authenticatedFetch(`${API_BASE_URL}/api/payment/create-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clinic_id: clinic.id,
          plan_name: "Professional", // Defaulting to professional upgrade for this flow
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

      const cashfree = await load({
        mode: process.env.NEXT_PUBLIC_CASHFREE_ENV === "production" ? "production" : "sandbox",
      });

      const checkoutOptions = {
        paymentSessionId: data.payment_session_id,
        returnUrl: `${window.location.origin}/portal/clinic-settings?order_id=${data.order_id}`,
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
          <h1>Hospital Settings</h1>
          <p>Manage hospital profile, infrastructure, medical staff, and billing.</p>
        </div>
      </div>

      {showExpiredWarning && (
        <div className={styles.warningBanner}>
          <AlertTriangle size={18} />
          <span>Your trial or subscription has expired. Please upgrade your plan to restore access.</span>
        </div>
      )}

      {/* Clinic Overview Top Card */}
      <div className={styles.overviewCard}>
        <div className={styles.overviewProfile}>
          <div className={styles.overviewAvatar}>
            <Activity size={32} />
          </div>
          <div className={styles.overviewInfo}>
            <h2>{clinicName || "Hospital Name"}</h2>
            <p><MapPin size={14} /> {clinicAddress || "Hospital Address"}</p>
            <div className={styles.overviewDetails}>
              <span className={styles.detailBadge}><Phone size={12} /> {clinicPhone}</span>
              <span className={styles.detailBadge}><Mail size={12} /> {clinicEmail}</span>
              <span className={styles.detailBadge}><Hash size={12} /> {clinicRegNumber}</span>
            </div>
          </div>
        </div>
        <div style={{ alignSelf: "flex-start" }}>
          <button className={styles.btnSecondary} onClick={() => setIsEditProfileOpen(true)}>
            <Settings size={16} />
            Edit Profile
          </button>
        </div>
      </div>

      <div className={styles.twoColumnGrid}>
        {/* Left Column: Medical Staff */}
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
          <div className={styles.cardBody} style={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
            <div className={styles.searchWrapper}>
              <Search size={16} className={styles.searchIcon} />
              <input 
                type="text" 
                placeholder="Search doctors by name or specialty..." 
                className={styles.searchInput}
                value={docSearchQuery}
                onChange={e => setDocSearchQuery(e.target.value)}
              />
            </div>
            
            <div className={styles.docList}>
              {filteredDoctors?.map((doc) => (
                <div key={doc.id} className={styles.docItem}>
                  <div className={styles.docAvatar}>
                    {doc.name?.[0].toUpperCase()}
                  </div>
                  <div className={styles.docInfo}>
                    <h4>Dr. {doc.name}</h4>
                    <span className={styles.docSpecialtyBadge}>{doc.specialty}</span>
                  </div>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => handleDeleteDoctor(doc.id, doc.name)}
                    title="Remove Doctor"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {(!filteredDoctors || filteredDoctors.length === 0) && (
                <p className={styles.emptyText}>No doctors found.</p>
              )}
            </div>

            <div className={styles.btnGroup}>
              <button
                className={styles.btnPrimary}
                onClick={() => setIsAddModalOpen(true)}
                disabled={doctors && doctors.length >= maxAllowedDoctors}
              >
                <UserPlus size={16} />
                Add Doctor
              </button>
              <Link href="/demo1/portal/nurse-management" className={styles.btnSecondary}>
                <Users size={16} />
                Manage Nurses
              </Link>
            </div>
            {doctors && doctors.length >= maxAllowedDoctors && (
              <p className={styles.limitText}>
                Staff limit reached on current plan.
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Hospital Infrastructure */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.iconBox}>
              <Building size={20} />
            </div>
            <h3>Hospital Infrastructure</h3>
          </div>
          <div className={styles.cardBody} style={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
            <div className={styles.statsGrid}>
              <div className={styles.statBox}>
                <span className={styles.statLabel}>Total Wards</span>
                <span className={styles.statValue}>{infraStats.wards}</span>
                <span className={styles.statSub}>Active wards</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statLabel}>Occupancy Rate</span>
                <span className={styles.statValue}>{infraStats.occupancyRate}</span>
                <span className={styles.statSubAlert}>High capacity</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statLabel}>Total Beds</span>
                <span className={styles.statValue}>{infraStats.totalBeds}</span>
                <span className={styles.statSub}>{infraStats.occupiedBeds} occupied</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statLabel}>Available Beds</span>
                <span className={styles.statValue}>{infraStats.availableBeds}</span>
                <span className={styles.statSub}>Ready for admission</span>
              </div>
            </div>

            <div className={styles.btnGroup}>
              <Link href="/portal/ward-management" className={styles.btnSecondary}>
                <DoorOpen size={16} />
                Manage Wards
              </Link>
              <Link href="/portal/bed-management" className={styles.btnSecondary}>
                <BedDouble size={16} />
                Manage Beds
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Compact Section */}
      <div className={styles.subscriptionCard}>
        <div className={styles.subDetails}>
          <div className={styles.subIcon}>
            <Award size={24} />
          </div>
          <div className={styles.subInfo}>
            <h4>{subscription ? `${subscription.plan_name} Plan Active` : trial.active ? '14-Day Free Trial' : 'Subscription Expired'}</h4>
            <p>
              {subscription 
                ? `Renews on ${new Date(subscription.end_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
                : trial.active 
                ? `Trial ends in ${trial.daysLeft} days` 
                : 'Please upgrade to restore access'}
            </p>
            <div className={styles.subFeatures}>
              <span className={styles.subFeature}><Check size={14} className={styles.featureCheck} /> {maxAllowedDoctors === 999 ? 'Unlimited' : maxAllowedDoctors} Doctors</span>
              <span className={styles.subFeature}><Check size={14} className={styles.featureCheck} /> Queue Manager</span>
              <span className={styles.subFeature}><Check size={14} className={styles.featureCheck} /> Hospital Infra Features</span>
            </div>
          </div>
        </div>
        <div style={{ marginLeft: "16px" }}>
          <button 
            className={styles.btnPrimary} 
            onClick={handleUpgradeCheckout}
            disabled={isCheckingOut || subscription?.plan_name === "Professional"}
          >
            <CreditCard size={16} />
            {isCheckingOut ? "Connecting..." : subscription?.plan_name === "Professional" ? "Highest Tier Active" : "Upgrade Plan"}
          </button>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditProfileOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsEditProfileOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Edit Hospital Profile</h3>
              <button className={styles.closeBtn} onClick={() => setIsEditProfileOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveClinic} className={styles.modalBody}>
              <div className={styles.field}>
                <label><ShieldCheck size={14} /> Hospital Name</label>
                <input type="text" value={clinicName} onChange={(e) => setClinicName(e.target.value)} required />
              </div>
              <div className={styles.field}>
                <label><Phone size={14} /> Contact Phone</label>
                <input type="text" value={clinicPhone} onChange={(e) => setClinicPhone(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label><Mail size={14} /> Contact Email</label>
                <input type="email" value={clinicEmail} onChange={(e) => setClinicEmail(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label><Hash size={14} /> Registration Number</label>
                <input type="text" value={clinicRegNumber} onChange={(e) => setClinicRegNumber(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label><MapPin size={14} /> Physical Address</label>
                <textarea rows={3} value={clinicAddress} onChange={(e) => setClinicAddress(e.target.value)} required />
              </div>
              <button type="submit" className={styles.modalAddBtn} disabled={isSavingClinic}>
                {isSavingClinic ? "Saving..." : "Save Profile Updates"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Doctor Modal */}
      {isAddModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsAddModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Add New Doctor</h3>
              <button className={styles.closeBtn} onClick={() => setIsAddModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleAddDoctor} className={styles.modalBody}>
              <div className={styles.field}>
                <label><Building size={14} /> Full Name (without Dr. prefix)</label>
                <input type="text" value={newDocName} onChange={(e) => setNewDocName(e.target.value)} required />
              </div>
              <div className={styles.field}>
                <label><Stethoscope size={14} /> Specialty</label>
                <input type="text" value={newDocSpecialty} onChange={(e) => setNewDocSpecialty(e.target.value)} required />
              </div>
              <div className={styles.field}>
                <label><Award size={14} /> Qualification</label>
                <input type="text" value={newDocQual} onChange={(e) => setNewDocQual(e.target.value)} required />
              </div>
              <div className={styles.field}>
                <label><Phone size={14} /> Contact Number</label>
                <input type="text" value={newDocContact} onChange={(e) => setNewDocContact(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label><FileText size={14} /> Medical License No. <span style={{ color: "#ef4444" }}>*</span></label>
                <input type="text" value={newDocRegNumber} onChange={(e) => setNewDocRegNumber(e.target.value)} required />
              </div>
              <div className={styles.field}>
                <label><Calendar size={14} /> License Expiry Date</label>
                <input type="date" value={newDocExpiry} onChange={(e) => setNewDocExpiry(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label><LinkIcon size={14} /> Profile Photo URL</label>
                <input type="text" value={newDocPhoto} onChange={(e) => setNewDocPhoto(e.target.value)} />
              </div>
              <button type="submit" className={styles.modalAddBtn} disabled={isAddingDoc}>
                {isAddingDoc ? "Adding..." : "Confirm Registration"}
              </button>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
