"use client";

import React, { useState, useEffect } from "react";
import styles from "./page.module.css";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdmissionManagementPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [currentAdmissions, setCurrentAdmissions] = useState<any[]>([]);
  const [draftAdmissions, setDraftAdmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchAdmissions = async () => {
    setLoading(true);
    try {
      const { data: admittedData, error: admittedError } = await supabase
        .from("admission_records")
        .select("id, patient_name, patient_id, department, ward, bed, doctor_name, date_admission, status, updated_at")
        .ilike("status", "Admitted")
        .order("date_admission", { ascending: false });

      if (admittedError) throw admittedError;

      const { data: draftData, error: draftError } = await supabase
        .from("admission_records")
        .select("id, patient_name, patient_id, department, ward, bed, doctor_name, date_admission, status, updated_at")
        .ilike("status", "Draft")
        .order("updated_at", { ascending: false });

      if (draftError) throw draftError;

      setCurrentAdmissions(admittedData || []);
      setDraftAdmissions(draftData || []);
    } catch (err) {
      console.error("Error fetching admissions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmissions();
  }, [supabase]);

  const handleDeleteDraft = async (id: string) => {
    if (!confirm("Delete this draft admission?\n\nThis action cannot be undone.")) return;
    try {
      const { error } = await supabase.from("admission_records").delete().eq("id", id);
      if (error) throw error;
      setDraftAdmissions((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      console.error("Error deleting draft:", err);
      alert("Failed to delete draft.");
    }
  };

  const filteredCurrent = currentAdmissions.filter((record) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (record.patient_name || "").toLowerCase().includes(term) ||
      (record.patient_id || "").toLowerCase().includes(term) ||
      (record.id || "").toLowerCase().includes(term)
    );
  });

  const filteredDrafts = draftAdmissions.filter((record) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (record.patient_name || "").toLowerCase().includes(term) ||
      (record.patient_id || "").toLowerCase().includes(term) ||
      (record.id || "").toLowerCase().includes(term)
    );
  });

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.header}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h1 className={styles.title}>Admission Management</h1>
              <p className={styles.subtitle}>
                Manage active admissions, drafts, and create new patient admissions.
              </p>
            </div>
            <Link href="/demo/portal/admission-record" className={styles.btnPrimary}>
              + New Admission
            </Link>
          </div>
        </div>

        <div className={styles.searchSection}>
          <div className={styles.searchBar}>
            <svg
              className={styles.searchIcon}
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search by Patient Name, Patient ID or Admission ID"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.contentGrid}>
          {/* Current Admissions Card */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Current Admissions</h2>
            </div>
            
            {loading ? (
              <div className={styles.emptyState}>
                <p className={styles.emptyText}>Loading admissions...</p>
              </div>
            ) : filteredCurrent.length === 0 ? (
              <div className={styles.emptyState}>
                <svg
                  className={styles.emptyIcon}
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                </svg>
                <p className={styles.emptyText}>
                  {searchTerm ? "No matching admissions found." : "No active admissions."}
                </p>
              </div>
            ) : (
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Admission ID</th>
                      <th>Patient Name</th>
                      <th>Department</th>
                      <th>Consultant</th>
                      <th>Admission Date</th>
                      <th>Ward / Bed</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCurrent.map((record) => (
                      <tr key={record.id}>
                        <td>{record.id?.slice(0, 8).toUpperCase()}</td>
                        <td>{record.patient_name || "Unknown"}</td>
                        <td>{record.department || "-"}</td>
                        <td>{record.doctor_name || "-"}</td>
                        <td>
                          {record.date_admission
                            ? new Date(record.date_admission).toLocaleDateString("en-IN")
                            : "-"}
                        </td>
                        <td>
                          {record.ward || record.bed
                            ? `${record.ward || "-"} / ${record.bed || "-"}`
                            : "-"}
                        </td>
                        <td>
                          <span style={{
                            display: "inline-block",
                            padding: "4px 12px",
                            borderRadius: "100px",
                            fontSize: "12px",
                            fontWeight: 700,
                            background: "#dcfce7",
                            color: "#166534"
                          }}>
                            {record.status?.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <div className={styles.actionsContainer}>
                            <button
                              className={styles.btnAction}
                              onClick={() => router.push(`/demo/portal/admission-record/view?id=${record.id}`)}
                            >
                              View
                            </button>
                            <button
                              className={styles.btnAction}
                              onClick={() => router.push(`/demo/portal/admission-record?draftId=${record.id}&patientId=${record.patient_id}`)}
                            >
                              Continue Admission
                            </button>
                            <button
                              className={styles.btnAction}
                              onClick={() => router.push(`/demo/portal/discharge-summary?admissionId=${record.id}&patientId=${record.patient_id}`)}
                            >
                              Create Discharge
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Draft Admissions Card */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Draft Admissions</h2>
            </div>
            
            {loading ? (
              <div className={styles.emptyState}>
                <p className={styles.emptyText}>Loading drafts...</p>
              </div>
            ) : filteredDrafts.length === 0 ? (
              <div className={styles.emptyState}>
                <svg
                  className={styles.emptyIcon}
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                <p className={styles.emptyText}>
                  {searchTerm ? "No matching drafts found." : "No draft admissions."}
                </p>
              </div>
            ) : (
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Admission ID</th>
                      <th>Patient Name</th>
                      <th>Department</th>
                      <th>Last Updated</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDrafts.map((record) => (
                      <tr key={record.id}>
                        <td>{record.id?.slice(0, 8).toUpperCase()}</td>
                        <td>{record.patient_name || "Unknown"}</td>
                        <td>{record.department || "-"}</td>
                        <td>
                          {record.updated_at || record.date_admission
                            ? new Date(record.updated_at || record.date_admission).toLocaleString("en-IN")
                            : "-"}
                        </td>
                        <td>
                          <span style={{
                            display: "inline-block",
                            padding: "4px 12px",
                            borderRadius: "100px",
                            fontSize: "12px",
                            fontWeight: 700,
                            background: "#fef3c7",
                            color: "#92400e"
                          }}>
                            {record.status?.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <div className={styles.actionsContainer}>
                            <button
                              className={styles.btnAction}
                              onClick={() => router.push(`/demo/portal/admission-record?draftId=${record.id}&patientId=${record.patient_id}`)}
                            >
                              Resume Draft
                            </button>
                            <button
                              className={`${styles.btnAction} ${styles.btnDanger}`}
                              onClick={() => handleDeleteDraft(record.id)}
                            >
                              Delete Draft
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
