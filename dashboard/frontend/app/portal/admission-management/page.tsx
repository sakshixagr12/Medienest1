"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("All");
  const [filterConsultant, setFilterConsultant] = useState("All");
  const [filterWard, setFilterWard] = useState("All");
  const [filterDate, setFilterDate] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [sortOption, setSortOption] = useState("Date (Newest)");

  // Pagination
  const [currentCurrentPage, setCurrentCurrentPage] = useState(1);
  const [draftCurrentPage, setDraftCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const fetchAdmissions = async () => {
    setLoading(true);
    try {
      const { data: admittedData, error: admittedError } = await supabase
        .from("admission_records")
        .select("id, patient_name, patient_id, contact, department, ward, bed, doctor_name, date_admission, status, updated_at")
        .ilike("status", "Admitted")
        .order("date_admission", { ascending: false });

      if (admittedError) throw admittedError;

      const { data: draftData, error: draftError } = await supabase
        .from("admission_records")
        .select("id, patient_name, patient_id, contact, department, ward, bed, doctor_name, date_admission, status, updated_at")
        .ilike("status", "Draft")
        .order("updated_at", { ascending: false });

      if (draftError) throw draftError;

      setCurrentAdmissions(admittedData || []);
      setDraftAdmissions(draftData || []);
    } catch (err) {
      console.error("Error fetching admissions:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAdmissions();
  }, [supabase]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchAdmissions();
  };

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

  // Extract unique values for filters
  const allRecords = [...currentAdmissions, ...draftAdmissions];
  const uniqueDepartments = Array.from(new Set(allRecords.map(r => r.department).filter(Boolean)));
  const uniqueConsultants = Array.from(new Set(allRecords.map(r => r.doctor_name).filter(Boolean)));
  const uniqueWards = Array.from(new Set(allRecords.map(r => r.ward).filter(Boolean)));

  // Filter Logic
  const applyFilters = (records: any[]) => {
    return records.filter(record => {
      // 1. Search
      const term = searchTerm.toLowerCase();
      const matchesSearch = !term || 
        (record.patient_name || "").toLowerCase().includes(term) ||
        (record.patient_id || "").toLowerCase().includes(term) ||
        (record.id || "").toLowerCase().includes(term) ||
        (record.contact || "").toLowerCase().includes(term);
      
      if (!matchesSearch) return false;

      // 2. Filters
      if (filterDepartment !== "All" && record.department !== filterDepartment) return false;
      if (filterConsultant !== "All" && record.doctor_name !== filterConsultant) return false;
      if (filterWard !== "All" && record.ward !== filterWard) return false;
      if (filterStatus !== "All" && record.status?.toUpperCase() !== filterStatus.toUpperCase()) return false;
      
      if (filterDate !== "All") {
        const recordDate = new Date(record.date_admission);
        const now = new Date();
        if (filterDate === "Today") {
          if (recordDate.toDateString() !== now.toDateString()) return false;
        } else if (filterDate === "This Week") {
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(now.getDate() - 7);
          if (recordDate < oneWeekAgo) return false;
        } else if (filterDate === "This Month") {
          const oneMonthAgo = new Date();
          oneMonthAgo.setMonth(now.getMonth() - 1);
          if (recordDate < oneMonthAgo) return false;
        }
      }
      return true;
    });
  };

  // Sort Logic
  const applySort = (records: any[]) => {
    return [...records].sort((a, b) => {
      if (sortOption === "Date (Newest)") return new Date(b.date_admission || b.updated_at).getTime() - new Date(a.date_admission || a.updated_at).getTime();
      if (sortOption === "Date (Oldest)") return new Date(a.date_admission || a.updated_at).getTime() - new Date(b.date_admission || b.updated_at).getTime();
      if (sortOption === "Name (A-Z)") return (a.patient_name || "").localeCompare(b.patient_name || "");
      if (sortOption === "Name (Z-A)") return (b.patient_name || "").localeCompare(a.patient_name || "");
      if (sortOption === "Department") return (a.department || "").localeCompare(b.department || "");
      return 0;
    });
  };

  // Process Data
  const processedCurrent = useMemo(() => {
    const filtered = applyFilters(currentAdmissions);
    return applySort(filtered);
  }, [currentAdmissions, searchTerm, filterDepartment, filterConsultant, filterWard, filterDate, filterStatus, sortOption]);

  const processedDrafts = useMemo(() => {
    const filtered = applyFilters(draftAdmissions);
    return applySort(filtered);
  }, [draftAdmissions, searchTerm, filterDepartment, filterConsultant, filterWard, filterDate, filterStatus, sortOption]);

  // Pagination Logic
  const paginatedCurrent = processedCurrent.slice((currentCurrentPage - 1) * ITEMS_PER_PAGE, currentCurrentPage * ITEMS_PER_PAGE);
  const totalCurrentPages = Math.ceil(processedCurrent.length / ITEMS_PER_PAGE);

  const paginatedDrafts = processedDrafts.slice((draftCurrentPage - 1) * ITEMS_PER_PAGE, draftCurrentPage * ITEMS_PER_PAGE);
  const totalDraftPages = Math.ceil(processedDrafts.length / ITEMS_PER_PAGE);

  // Summary Metrics
  const totalActive = currentAdmissions.length;
  const totalDraft = draftAdmissions.length;
  const todayAdmissionsCount = allRecords.filter(a => a.date_admission && new Date(a.date_admission).toDateString() === new Date().toDateString()).length;

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentCurrentPage(1);
    setDraftCurrentPage(1);
  }, [searchTerm, filterDepartment, filterConsultant, filterWard, filterDate, filterStatus, sortOption]);

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
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <Link href="/portal/doctor-dashboard" className={styles.btnSecondary} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="19" y1="12" x2="5" y2="12"></line>
                  <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
                Back to Doctor Desk
              </Link>
              <Link href="/portal/admission-record?new=true" className={styles.btnPrimary}>
                + New Admission
              </Link>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <span className={styles.summaryTitle}>Active Admissions</span>
            <span className={styles.summaryValue}>{totalActive}</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryTitle}>Draft Admissions</span>
            <span className={styles.summaryValue}>{totalDraft}</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryTitle}>Today&apos;s Admissions</span>
            <span className={styles.summaryValue}>{todayAdmissionsCount}</span>
          </div>
        </div>

        {/* Controls Section (Search, Filters, Sort) */}
        <div className={styles.controlsSection}>
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
            <div className={styles.searchBar} style={{ flex: "1 1 300px" }}>
              <svg className={styles.searchIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search by Patient Name, Patient ID, Admission ID or Phone"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className={styles.actionsRow}>
              <button 
                className={styles.btnSecondary} 
                onClick={handleRefresh}
                disabled={isRefreshing || loading}
              >
                {isRefreshing ? "Refreshing..." : "Refresh Data"}
              </button>
            </div>
          </div>
          
          <div className={styles.filtersRow}>
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Status:</span>
              <select className={styles.filterSelect} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="All">All</option>
                <option value="Admitted">Admitted</option>
                <option value="Draft">Draft</option>
              </select>
            </div>
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Date:</span>
              <select className={styles.filterSelect} value={filterDate} onChange={(e) => setFilterDate(e.target.value)}>
                <option value="All">All Time</option>
                <option value="Today">Today</option>
                <option value="This Week">This Week</option>
                <option value="This Month">This Month</option>
              </select>
            </div>
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Department:</span>
              <select className={styles.filterSelect} value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)}>
                <option value="All">All Departments</option>
                {uniqueDepartments.map(d => <option key={d as string} value={d as string}>{d as string}</option>)}
              </select>
            </div>
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Consultant:</span>
              <select className={styles.filterSelect} value={filterConsultant} onChange={(e) => setFilterConsultant(e.target.value)}>
                <option value="All">All Consultants</option>
                {uniqueConsultants.map(c => <option key={c as string} value={c as string}>{c as string}</option>)}
              </select>
            </div>
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Ward:</span>
              <select className={styles.filterSelect} value={filterWard} onChange={(e) => setFilterWard(e.target.value)}>
                <option value="All">All Wards</option>
                {uniqueWards.map(w => <option key={w as string} value={w as string}>{w as string}</option>)}
              </select>
            </div>
            <div className={styles.filterGroup} style={{ marginLeft: "auto" }}>
              <span className={styles.filterLabel}>Sort By:</span>
              <select className={styles.filterSelect} value={sortOption} onChange={(e) => setSortOption(e.target.value)}>
                <option value="Date (Newest)">Date (Newest)</option>
                <option value="Date (Oldest)">Date (Oldest)</option>
                <option value="Name (A-Z)">Name (A-Z)</option>
                <option value="Name (Z-A)">Name (Z-A)</option>
                <option value="Department">Department</option>
              </select>
            </div>
          </div>
        </div>

        <div className={styles.contentGrid}>
          {/* Current Admissions Card */}
          {(filterStatus === "All" || filterStatus === "Admitted") && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Current Admissions</h2>
              </div>
              
              {loading ? (
                <div className={styles.emptyState}>
                  <p className={styles.emptyText}>Loading admissions...</p>
                </div>
              ) : processedCurrent.length === 0 ? (
                <div className={styles.emptyState}>
                  <svg className={styles.emptyIcon} width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                  </svg>
                  <p className={styles.emptyText}>
                    {searchTerm || filterDepartment !== "All" ? "No admissions match the selected filters." : "No active admissions."}
                  </p>
                </div>
              ) : (
                <>
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
                        {paginatedCurrent.map((record) => (
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
                                  style={{ background: "#3b82f6", color: "white", padding: "8px 16px", borderRadius: "8px", border: "none", fontWeight: "600", cursor: "pointer" }}
                                  onClick={() => router.push(`/portal/admission-workspace/${record.id}`)}
                                >
                                  Manage Workspace
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {totalCurrentPages > 1 && (
                    <div className={styles.pagination}>
                      <span className={styles.pageInfo}>Page {currentCurrentPage} of {totalCurrentPages}</span>
                      <div className={styles.pageControls}>
                        <button 
                          className={styles.btnPage} 
                          onClick={() => setCurrentCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentCurrentPage === 1}
                        >
                          Previous
                        </button>
                        <button 
                          className={styles.btnPage} 
                          onClick={() => setCurrentCurrentPage(p => Math.min(totalCurrentPages, p + 1))}
                          disabled={currentCurrentPage === totalCurrentPages}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Draft Admissions Card */}
          {(filterStatus === "All" || filterStatus === "Draft") && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Draft Admissions</h2>
              </div>
              
              {loading ? (
                <div className={styles.emptyState}>
                  <p className={styles.emptyText}>Loading drafts...</p>
                </div>
              ) : processedDrafts.length === 0 ? (
                <div className={styles.emptyState}>
                  <svg className={styles.emptyIcon} width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                  <p className={styles.emptyText}>
                    {searchTerm || filterDepartment !== "All" ? "No drafts match the selected filters." : "No draft admissions."}
                  </p>
                </div>
              ) : (
                <>
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
                        {paginatedDrafts.map((record) => (
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
                                  onClick={() => router.push(`/portal/admission-record?draftId=${record.id}&patientId=${record.patient_id}`)}
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
                  {totalDraftPages > 1 && (
                    <div className={styles.pagination}>
                      <span className={styles.pageInfo}>Page {draftCurrentPage} of {totalDraftPages}</span>
                      <div className={styles.pageControls}>
                        <button 
                          className={styles.btnPage} 
                          onClick={() => setDraftCurrentPage(p => Math.max(1, p - 1))}
                          disabled={draftCurrentPage === 1}
                        >
                          Previous
                        </button>
                        <button 
                          className={styles.btnPage} 
                          onClick={() => setDraftCurrentPage(p => Math.min(totalDraftPages, p + 1))}
                          disabled={draftCurrentPage === totalDraftPages}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
