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
} from "lucide-react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { useClinic } from "@/context/ClinicContext";
import { createClient } from "@/lib/supabase/client";
import { normalizeDoctorName } from "@/lib/utils";
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
  const [isAddingDoc, setIsAddingDoc] = useState(false);

  useEffect(() => {
    if (clinic) {
      setClinicName(clinic.name || "");
      setClinicAddress(clinic.address || "");
    }
  }, [clinic]);

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
    if (doctors && doctors.length >= 2) {
      alert("Clinic Limit Reached: Maximum 2 doctors allowed per clinic.");
      return;
    }

    setIsAddingDoc(true);
    try {
      const normalizedName = normalizeDoctorName(newDocName);
      // 1. Insert into doctors table
      const { data: newDoc, error: docErr } = await supabase
        .from("doctors")
        .insert([
          {
            name: normalizedName,
            specialty: newDocSpecialty || "General Consultant",
            qualification: newDocQual,
          },
        ])
        .select()
        .single();

      if (docErr) throw docErr;

      // 2. Map to clinic
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
      setIsAddModalOpen(false);
      refresh();
      alert(`Dr. ${normalizedName} added to the clinic staff!`);
    } catch (e: any) {
      alert("Error adding doctor: " + e.message);
    } finally {
      setIsAddingDoc(false);
    }
  };

  return (
    <DashboardLayout>
      <div className={styles.header}>
        <Link href="/portal/front-desk" className={styles.backBtn}>
          <ChevronLeft size={18} />
          <span>Back to Front Desk</span>
        </Link>
        <div className={styles.headerText}>
          <h1>Clinic Management</h1>
          <p>Update branding and manage your medical staff (Max 2 Doctors)</p>
        </div>
      </div>

      <div className={styles.grid}>
        {/* Left: Clinic Profile */}
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

        {/* Right: Staff Management */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.iconBox}>
              <Users size={20} />
            </div>
            <h3>Medical Staff</h3>
            <span className={styles.countBadge}>
              {doctors?.length || 0} / 2
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
                </div>
              ))}
              {(!doctors || doctors.length === 0) && (
                <p className={styles.emptyText}>No doctors added yet.</p>
              )}
            </div>

            <button
              className={styles.addBtn}
              onClick={() => setIsAddModalOpen(true)}
              disabled={doctors && doctors.length >= 2}
            >
              <UserPlus size={18} />
              Add New Doctor
            </button>
            {doctors && doctors.length >= 2 && (
              <p className={styles.limitText}>
                Limit reached. Upgrade plan for more doctors.
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
              ></button>
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
