"use client";

import React, { useState, useEffect } from "react";
import styles from "./page.module.css";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function DischargeManagementPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [pendingDischarges, setPendingDischarges] = useState<any[]>([]);
  const [recentlyDischarged, setRecentlyDischarged] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPendingDischarges = async () => {
      try {
        const [pendingRes, recentRes, summariesRes] = await Promise.all([
          supabase
            .from("admission_records")
            .select("id, patient_name, patient_id, department, ward, bed, doctor_name, date_admission, status")
            .eq("status", "Admitted")
            .order("date_admission", { ascending: false }),
          supabase
            .from("admission_records")
            .select("id, patient_name, patient_id, department, ward, bed, doctor_name, date_admission, date_discharge, discharge_summary_id, status")
            .eq("status", "Discharged")
            .order("date_discharge", { ascending: false })
            .limit(50),
          supabase
            .from("discharge_summaries")
            .select("patient_name, date_admission")
        ]);

        if (pendingRes.error) throw pendingRes.error;

        // Filter out any "Admitted" records that actually have a matching discharge summary
        // (This self-heals the UI for legacy records whose status wasn't updated)
        let actualPending = pendingRes.data || [];
        if (summariesRes.data && summariesRes.data.length > 0) {
          const dischargedAdmissionsToUpdate: string[] = [];
          
          actualPending = (pendingRes.data || []).filter(adm => {
             const isDischarged = summariesRes.data.some(sum => 
                sum.patient_name === adm.patient_name && 
                sum.date_admission === adm.date_admission
             );
             if (isDischarged) dischargedAdmissionsToUpdate.push(adm.id);
             return !isDischarged;
          });
          
          // Fire-and-forget background update to heal the DB
          if (dischargedAdmissionsToUpdate.length > 0) {
            Promise.all(dischargedAdmissionsToUpdate.map(id => 
               supabase.from("admission_records").update({ status: "Discharged" }).eq("id", id)
            )).catch(err => console.error("Failed to auto-heal admission statuses", err));
          }
        }

        // if recentRes errors (e.g. no date_discharge col), we'll try fetching without it below:
        if (recentRes.error) {
           const fallbackRes = await supabase
             .from("admission_records")
             .select("id, patient_name, patient_id, department, ward, bed, doctor_name, date_admission, status")
             .eq("status", "Discharged")
             .order("date_admission", { ascending: false })
             .limit(50);
           if (!fallbackRes.error) {
              setRecentlyDischarged(fallbackRes.data || []);
           }
        } else {
           setRecentlyDischarged(recentRes.data || []);
        }

        setPendingDischarges(actualPending);
      } catch (err) {
        console.error("Error fetching pending discharges:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPendingDischarges();
  }, [supabase]);

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.title}>Discharge Management</h1>
          <p className={styles.subtitle}>
            Manage pending and completed patient discharges.
          </p>
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
            />
          </div>
        </div>

        <div className={styles.contentGrid}>
          {/* Pending Discharges Card */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Pending Discharges</h2>
            </div>
            
            {loading ? (
              <div className={styles.emptyState}>
                <p className={styles.emptyText}>Loading...</p>
              </div>
            ) : pendingDischarges.length === 0 ? (
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
                  <path d="M12 8v4l3 3"></path>
                  <circle cx="12" cy="12" r="10"></circle>
                </svg>
                <p className={styles.emptyText}>No pending discharges.</p>
              </div>
            ) : (
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Admission ID</th>
                      <th>Patient Name</th>
                      <th>Patient ID</th>
                      <th>Department</th>
                      <th>Ward / Bed</th>
                      <th>Consultant</th>
                      <th>Admission Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingDischarges.map((record) => (
                      <tr key={record.id}>
                        <td>
                          {record.id ? record.id.substring(0, 8).toUpperCase() : "—"}
                        </td>
                        <td>{record.patient_name || "—"}</td>
                        <td>
                          {record.patient_id ? record.patient_id.substring(0, 8).toUpperCase() : "—"}
                        </td>
                        <td>{record.department || "—"}</td>
                        <td>
                          {record.ward ? `${record.ward} / ${record.bed || "—"}` : "—"}
                        </td>
                        <td>{record.doctor_name || "—"}</td>
                        <td>
                          {record.date_admission
                            ? new Date(record.date_admission).toLocaleDateString()
                            : "—"}
                        </td>
                        <td>
                          <button
                            className={styles.btnAction}
                            onClick={() => {
                              if (!record.id) {
                                alert("Invalid Admission ID");
                                return;
                              }
                              router.push(`/portal/discharge-summary?admissionId=${record.id}`);
                            }}
                          >
                            Create Discharge
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recently Discharged Card */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Recently Discharged</h2>
            </div>
            {recentlyDischarged.length === 0 ? (
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
                <p className={styles.emptyText}>No discharge records found.</p>
              </div>
            ) : (
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Admission ID</th>
                      <th>Patient Name</th>
                      <th>Patient ID</th>
                      <th>Consultant</th>
                      <th>Discharge Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentlyDischarged.map((record) => (
                      <tr key={record.id}>
                        <td>
                          {record.id ? record.id.substring(0, 8).toUpperCase() : "—"}
                        </td>
                        <td>{record.patient_name || "—"}</td>
                        <td>
                          {record.patient_id ? record.patient_id.substring(0, 8).toUpperCase() : "—"}
                        </td>
                        <td>{record.doctor_name || "—"}</td>
                        <td>
                          {record.date_discharge
                            ? new Date(record.date_discharge).toLocaleDateString()
                            : record.date_admission ? new Date(record.date_admission).toLocaleDateString() : "—"}
                        </td>
                        <td>
                          <button
                            className={styles.btnActionSecondary}
                            onClick={async () => {
                              if (record.discharge_summary_id) {
                                router.push(`/portal/discharge-summary/view?id=${record.discharge_summary_id}`);
                              } else {
                                const { data } = await supabase
                                  .from("discharge_summaries")
                                  .select("id")
                                  .eq("patient_name", record.patient_name)
                                  .eq("date_admission", record.date_admission)
                                  .order("created_at", { ascending: false })
                                  .limit(1)
                                  .single();
                                if (data?.id) {
                                  router.push(`/portal/discharge-summary/view?id=${data.id}`);
                                } else {
                                  alert("Discharge summary not found.");
                                }
                              }
                            }}
                          >
                            View Discharge
                          </button>
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
