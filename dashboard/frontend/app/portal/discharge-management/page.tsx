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
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

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
          
          actualPending = (pendingRes.data || []).filter((adm: any) => {
             const isDischarged = summariesRes.data.some((sum: any) => 
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

        // Generate mock statuses for UI demonstration
        const getMockStatus = (id: string) => {
          if (!id) return "Ready";
          const num = id.charCodeAt(0) + id.charCodeAt(id.length - 1);
          const rem = num % 4;
          if (rem === 0) return "Ready";
          if (rem === 1) return "Doctor Pending";
          if (rem === 2) return "Billing Pending";
          return "Documents Missing";
        };

        actualPending = actualPending.map((adm: any) => ({
          ...adm,
          mock_status: getMockStatus(adm.id)
        }));

        setPendingDischarges(actualPending);
      } catch (err) {
        console.error("Error fetching pending discharges:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPendingDischarges();
  }, [supabase]);

  const filteredPendingDischarges = pendingDischarges.filter((record) => {
    if (filterStatus !== "All" && record.mock_status !== filterStatus) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (record.patient_name || "").toLowerCase().includes(term) ||
      (record.patient_id || "").toLowerCase().includes(term) ||
      (record.id || "").toLowerCase().includes(term)
    );
  });

  const filteredRecentlyDischarged = recentlyDischarged.filter((record) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (record.patient_name || "").toLowerCase().includes(term) ||
      (record.patient_id || "").toLowerCase().includes(term) ||
      (record.id || "").toLowerCase().includes(term)
    );
  });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const readyCount = pendingDischarges.filter(r => r.mock_status === "Ready").length;
  const pendingCount = pendingDischarges.length;
  const todayCount = recentlyDischarged.filter(r => {
    const dDate = r.date_discharge || r.date_admission;
    return dDate && new Date(dDate) >= todayStart;
  }).length;
  const totalCount = recentlyDischarged.length;

  const getAvatarStyle = (name: string) => {
    if (!name) return { bg: '#f1f5f9', color: '#475569' };
    const char = name.charCodeAt(0);
    const colors = [
      { bg: '#fee2e2', color: '#991b1b' }, // Red
      { bg: '#ffedd5', color: '#9a3412' }, // Orange
      { bg: '#fef08a', color: '#854d0e' }, // Yellow
      { bg: '#dcfce7', color: '#166534' }, // Green
      { bg: '#dbeafe', color: '#1e40af' }, // Blue
      { bg: '#e0e7ff', color: '#3730a3' }, // Indigo
      { bg: '#fae8ff', color: '#86198f' }  // Fuchsia
    ];
    return colors[char % colors.length];
  };

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.header}>
          <button 
            onClick={() => router.back()} 
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#64748b', fontSize: '14px', fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: '16px' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            Back
          </button>
          <h1 className={styles.title}>Discharge Management</h1>
          <p className={styles.subtitle}>
            Manage pending and completed patient discharges.
          </p>
        </div>

        <div className={styles.summaryCards}>
          <div className={styles.summaryCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ padding: '8px', background: '#e0e7ff', color: '#3730a3', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>
              </div>
              <p className={styles.summaryTitle}>Pending Discharges</p>
            </div>
            <p className={styles.summaryValue}>{pendingCount}</p>
          </div>
          <div className={styles.summaryCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ padding: '8px', background: '#dcfce7', color: '#166534', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              <p className={styles.summaryTitle}>Ready for Discharge</p>
            </div>
            <p className={styles.summaryValue}>{readyCount}</p>
          </div>
          <div className={styles.summaryCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ padding: '8px', background: '#fef08a', color: '#854d0e', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </div>
              <p className={styles.summaryTitle}>Today's Discharges</p>
            </div>
            <p className={styles.summaryValue}>{todayCount}</p>
          </div>
          <div className={styles.summaryCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ padding: '8px', background: '#f1f5f9', color: '#475569', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              </div>
              <p className={styles.summaryTitle}>Total Discharges</p>
            </div>
            <p className={styles.summaryValue}>{totalCount}</p>
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
          
          <div className={styles.filterChips}>
            {["All", "Ready", "Doctor Pending", "Billing Pending", "Documents Missing"].map(status => (
              <button
                key={status}
                className={`${styles.filterChip} ${filterStatus === status ? styles.filterChipActive : ''}`}
                onClick={() => setFilterStatus(status)}
              >
                {status}
              </button>
            ))}
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
            ) : filteredPendingDischarges.length === 0 ? (
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
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <p className={styles.emptyText} style={{ fontWeight: 600 }}>No pending discharges.</p>
                <p className={styles.emptyText} style={{ fontSize: 13, marginTop: 4, opacity: 0.8 }}>All eligible patients have been discharged.</p>
              </div>
            ) : (
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Admission Details</th>
                      <th>Patient</th>
                      <th>Location</th>
                      <th>Consultant</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPendingDischarges.map((record) => (
                      <tr key={record.id}>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                            <span style={{ fontWeight: 700, color: "#1e40af", background: "#dbeafe", padding: "2px 8px", borderRadius: "4px", fontSize: "12px", border: "1px solid #bfdbfe" }}>
                              {record.id ? record.id.substring(0, 8).toUpperCase() : "—"}
                            </span>
                            <span style={{ fontSize: 12, color: "var(--sanctuary-ink-l)", display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                              {record.date_admission ? new Date(record.date_admission).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : "—"}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: getAvatarStyle(record.patient_name).bg, color: getAvatarStyle(record.patient_name).color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px', border: `1px solid ${getAvatarStyle(record.patient_name).color}33` }}>
                              {record.patient_name ? record.patient_name.charAt(0).toUpperCase() : "?"}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ fontWeight: 700, color: "var(--sanctuary-ink)" }}>{record.patient_name || "—"}</span>
                              <span style={{ fontSize: 12, color: "var(--sanctuary-ink-l)" }}>ID: {record.patient_id ? record.patient_id.substring(0, 8).toUpperCase() : "—"}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
                            <span style={{ fontWeight: 600, color: "#475569", background: "#f1f5f9", padding: "2px 8px", borderRadius: "12px", fontSize: "12px", border: "1px solid #e2e8f0" }}>{record.department || "General"}</span>
                            <span style={{ fontSize: 13, color: "var(--sanctuary-ink-l)", paddingLeft: '2px', marginTop: '2px' }}>{record.ward ? `${record.ward} / Bed ${record.bed || "—"}` : "—"}</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--sanctuary-ink-l)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                            <span style={{ fontWeight: 600 }}>{record.doctor_name || "—"}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`${styles.badge} ${
                            record.mock_status === 'Ready' ? styles.badgeReady :
                            record.mock_status === 'Doctor Pending' ? styles.badgeDoctor :
                            record.mock_status === 'Billing Pending' ? styles.badgeBilling :
                            styles.badgeDocs
                          }`}>
                            {record.mock_status === 'Ready' && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                            {record.mock_status === 'Doctor Pending' && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>}
                            {record.mock_status === 'Billing Pending' && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>}
                            {record.mock_status === 'Documents Missing' && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>}
                            <span>{record.mock_status}</span>
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className={styles.btnAction}
                            disabled={record.mock_status !== 'Ready'}
                            title={record.mock_status !== 'Ready' ? `Waiting for ${record.mock_status.toLowerCase()}` : "Ready to discharge"}
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
            
            {filteredRecentlyDischarged.length === 0 ? (
              <div className={styles.emptyState}>
                <p className={styles.emptyText} style={{ opacity: 0.8 }}>No recent discharges found.</p>
              </div>
            ) : (
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Admission Details</th>
                      <th>Patient</th>
                      <th>Location</th>
                      <th>Consultant</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecentlyDischarged.map((record) => (
                      <tr key={record.id}>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                            <span style={{ fontWeight: 700, color: "#1e40af", background: "#dbeafe", padding: "2px 8px", borderRadius: "4px", fontSize: "12px", border: "1px solid #bfdbfe" }}>
                              {record.id ? record.id.substring(0, 8).toUpperCase() : "—"}
                            </span>
                            <span style={{ fontSize: 12, color: "var(--sanctuary-ink-l)", display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                              {record.date_discharge ? new Date(record.date_discharge).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : record.date_admission ? new Date(record.date_admission).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : "—"}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: getAvatarStyle(record.patient_name).bg, color: getAvatarStyle(record.patient_name).color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px', border: `1px solid ${getAvatarStyle(record.patient_name).color}33` }}>
                              {record.patient_name ? record.patient_name.charAt(0).toUpperCase() : "?"}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ fontWeight: 700, color: "var(--sanctuary-ink)" }}>{record.patient_name || "—"}</span>
                              <span style={{ fontSize: 12, color: "var(--sanctuary-ink-l)" }}>ID: {record.patient_id ? record.patient_id.substring(0, 8).toUpperCase() : "—"}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
                            <span style={{ fontWeight: 600, color: "#475569", background: "#f1f5f9", padding: "2px 8px", borderRadius: "12px", fontSize: "12px", border: "1px solid #e2e8f0" }}>{record.department || "General"}</span>
                            <span style={{ fontSize: 13, color: "var(--sanctuary-ink-l)", paddingLeft: '2px', marginTop: '2px' }}>{record.ward ? `${record.ward} / Bed ${record.bed || "—"}` : "—"}</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--sanctuary-ink-l)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                            <span style={{ fontWeight: 600 }}>{record.doctor_name || "—"}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`${styles.badge} ${styles.badgeCompleted}`}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                            <span>Completed</span>
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className={styles.btnAction}
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
