"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./page.module.css";
import TopBar from "@/components/TopBar";
import Link from "next/link";

interface Shift {
  id: string;
  shift_code: string;
  shift_name: string;
  start_time: string;
  end_time: string;
  is_night_shift: boolean;
  badge_color: string;
  display_order: number;
  is_default: boolean;
  is_active: boolean;
  description: string;
  assigned_count?: number;
}

import { EMPLOYEE_ROLES } from "./constants";

const BADGE_COLORS = [
  { value: "blue", label: "Blue" },
  { value: "orange", label: "Orange" },
  { value: "purple", label: "Purple" },
  { value: "green", label: "Green" },
  { value: "gray", label: "Gray" }
];

export default function ShiftManagementPage() {
  const supabase = createClient();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  // Form State
  const [formData, setFormData] = useState<Partial<Shift>>({
    shift_code: "",
    shift_name: "",
    start_time: "",
    end_time: "",
    is_night_shift: false,
    badge_color: "gray",
    display_order: 10,
    description: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchShifts();
  }, []);

  const fetchShifts = async () => {
    setIsLoading(true);
    const { data: shiftData, error } = await supabase
      .from("shifts")
      .select("*")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching shifts:", error.message, error);
      setIsLoading(false);
      return;
    }
    
    // Efficiently aggregate counts across all roles
    const countsByShift: Record<string, number> = {};
    (shiftData || []).forEach(s => countsByShift[s.id] = 0);

    for (const role of EMPLOYEE_ROLES) {
      const { data: activeEmployees, error: roleError } = await supabase
        .from(role.tableName)
        .select("shift_id")
        .eq("status", "Active");
      
      if (!roleError && activeEmployees) {
        activeEmployees.forEach(emp => {
          if (emp.shift_id && countsByShift[emp.shift_id] !== undefined) {
             countsByShift[emp.shift_id]++;
          }
        });
      }
    }

    const shiftsWithCounts = (shiftData || []).map(shift => ({
      ...shift,
      assigned_count: countsByShift[shift.id]
    }));

    setShifts(shiftsWithCounts);
    setIsLoading(false);
  };

  const handleOpenModal = (shift?: Shift) => {
    if (shift) {
      if (shift.is_default) {
        alert("Default core shifts cannot be modified directly.");
        return;
      }
      setEditingId(shift.id);
      setFormData({
        shift_code: shift.shift_code,
        shift_name: shift.shift_name,
        start_time: shift.start_time.substring(0, 5), // 'HH:MM:SS' to 'HH:MM'
        end_time: shift.end_time.substring(0, 5),
        is_night_shift: shift.is_night_shift,
        badge_color: shift.badge_color,
        display_order: shift.display_order,
        description: shift.description || "",
      });
    } else {
      setEditingId(null);
      setFormData({
        shift_code: "",
        shift_name: "",
        start_time: "",
        end_time: "",
        is_night_shift: false,
        badge_color: "gray",
        display_order: 10,
        description: "",
      });
    }
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setErrorMsg("");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg("");

    try {
      // Basic time validation
      if (!formData.start_time || !formData.end_time) {
        throw new Error("Start and end times are required.");
      }

      if (editingId) {
        // Update
        const { error } = await supabase
          .from("shifts")
          .update({
            shift_code: formData.shift_code,
            shift_name: formData.shift_name,
            start_time: formData.start_time,
            end_time: formData.end_time,
            is_night_shift: formData.is_night_shift,
            badge_color: formData.badge_color,
            display_order: formData.display_order,
            description: formData.description,
          })
          .eq("id", editingId)
          .eq("is_default", false); // Extra safety check

        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase.from("shifts").insert([
          {
            shift_code: formData.shift_code,
            shift_name: formData.shift_name,
            start_time: formData.start_time,
            end_time: formData.end_time,
            is_night_shift: formData.is_night_shift,
            badge_color: formData.badge_color,
            display_order: formData.display_order,
            description: formData.description,
            is_default: false,
            is_active: true
          },
        ]);

        if (error) {
          if (error.code === '23505') {
             throw new Error("A shift with this Shift Code or Name already exists.");
          }
          throw error;
        }
      }

      fetchShifts();
      handleCloseModal();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "An error occurred while saving.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (shift: Shift) => {
    if (shift.is_default) {
       alert("Default core shifts cannot be deactivated.");
       return;
    }
    
    // Check assignments before deactivating
    if (shift.is_active) {
      let hasActiveEmployees = false;
      
      for (const role of EMPLOYEE_ROLES) {
        const { data: assignments, error } = await supabase
          .from(role.tableName)
          .select("id")
          .eq("shift_id", shift.id)
          .eq("status", "Active")
          .limit(1);
          
        if (!error && assignments && assignments.length > 0) {
          hasActiveEmployees = true;
          break;
        }
      }
      
      if (hasActiveEmployees) {
        alert("This shift is assigned to active employees. Please reassign them before deactivating or deleting this shift.");
        return;
      }
    }

    if (!confirm(`Are you sure you want to ${shift.is_active ? 'deactivate' : 'reactivate'} this shift?`)) return;

    try {
      const { error } = await supabase
        .from("shifts")
        .update({ is_active: !shift.is_active })
        .eq("id", shift.id);

      if (error) throw error;
      fetchShifts();
    } catch (err) {
      console.error("Error toggling shift status:", err);
      alert("Failed to update shift status.");
    }
  };

  // Filtering
  const filteredShifts = shifts.filter((shift) =>
    shift.shift_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    shift.shift_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Stats Logic
  const totalShifts = shifts.length;
  const activeShifts = shifts.filter(s => s.is_active).length;
  const nightShifts = shifts.filter(s => s.is_night_shift).length;
  const inactiveShifts = shifts.filter(s => !s.is_active).length;

  const calculateDuration = (start: string, end: string, isNight: boolean) => {
    if (!start || !end) return "-";
    const parseTime = (timeStr: string) => {
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + (m || 0);
    };
    let sMin = parseTime(start);
    let eMin = parseTime(end);
    
    let diff = eMin - sMin;
    if (diff < 0 || isNight) {
      diff += 24 * 60;
    }
    
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return `${h}h ${m > 0 ? m + 'm' : ''}`;
  };

  const getBadgeClass = (color: string) => {
    switch (color) {
      case "blue": return styles.badgeColorBlue;
      case "orange": return styles.badgeColorOrange;
      case "purple": return styles.badgeColorPurple;
      case "green": return styles.badgeColorGreen;
      default: return styles.badgeColorGray;
    }
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return "";
    const [h, m] = timeStr.split(':');
    return `${h}:${m}`;
  };

  return (
    <div className="pageWrapper" style={{ minHeight: "100vh", background: "var(--sanctuary-bg)" }}>
      <TopBar title="Shift Management" backHref="/portal/clinic-settings" />
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Shift Management</h1>
            <p className={styles.subtitle}>Configure working hours, rotas, and assignment rules.</p>
          </div>
          <div className={styles.headerActions}>
            <input
              type="text"
              placeholder="Search shift name or code..."
              className={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              className={styles.btnAdd}
              onClick={() => handleOpenModal()}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              >
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add Shift
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.iconBlue}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{totalShifts}</span>
              <span className={styles.statLabel}>Total Shifts</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.iconGreen}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{activeShifts}</span>
              <span className={styles.statLabel}>Active Shifts</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.iconPurple}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{nightShifts}</span>
              <span className={styles.statLabel}>Night Shifts</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.iconRed}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="9" x2="15" y2="15"></line><line x1="15" y1="9" x2="9" y2="15"></line></svg>
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{inactiveShifts}</span>
              <span className={styles.statLabel}>Inactive Shifts</span>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Shift</th>
                <th>Timing</th>
                <th>Employees Assigned</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>Loading shifts...</td>
                </tr>
              ) : filteredShifts.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className={styles.emptyState}>
                      No shifts found matching your criteria.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredShifts.map(shift => (
                  <tr key={shift.id}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontWeight: 600, color: '#0f172a' }}>
                           <span className={`${styles.badge} ${getBadgeClass(shift.badge_color)}`} style={{ marginRight: '8px', padding: '2px 8px', fontSize: '11px' }}>
                             {shift.shift_code}
                           </span>
                           {shift.shift_name}
                        </span>
                        <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {shift.is_night_shift && (
                             <span style={{ backgroundColor: '#1e293b', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600 }}>NIGHT</span>
                          )}
                          Duration: {calculateDuration(shift.start_time, shift.end_time, shift.is_night_shift)}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, color: '#334155' }}>
                        {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                         <div style={{ backgroundColor: '#f1f5f9', padding: '4px 10px', borderRadius: '12px', fontWeight: 600, color: '#0f172a', fontSize: '13px' }}>
                           {shift.assigned_count} Employees
                         </div>
                      </div>
                    </td>
                    <td>
                      <span className={`${styles.badge} ${shift.is_active ? styles.badgeActive : styles.badgeInactive}`}>
                        {shift.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <Link href={`/portal/shift-management/${shift.id}`}>
                          <button className={styles.btnAction} title="View Details">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                          </button>
                        </Link>
                        {!shift.is_default && (
                          <>
                            <button className={styles.btnAction} title="Edit Shift" onClick={() => handleOpenModal(shift)}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </button>
                            <button 
                              className={styles.btnAction} 
                              title={shift.is_active ? "Deactivate" : "Reactivate"}
                              onClick={() => handleToggleStatus(shift)}
                              style={{ color: shift.is_active ? '#ef4444' : '#10b981' }}
                            >
                              {shift.is_active ? (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="9" x2="15" y2="15"></line><line x1="15" y1="9" x2="9" y2="15"></line></svg>
                              ) : (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {editingId ? "Edit Shift" : "Add New Shift"}
              </h2>
              <button className={styles.btnClose} onClick={handleCloseModal}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className={styles.modalBody}>
                {errorMsg && <div className={styles.errorText}>{errorMsg}</div>}
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Shift Code *</label>
                    <input
                      type="text"
                      className={styles.input}
                      required
                      placeholder="e.g. SHF-WE"
                      value={formData.shift_code}
                      onChange={(e) =>
                        setFormData({ ...formData, shift_code: e.target.value })
                      }
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Shift Name *</label>
                    <input
                      type="text"
                      className={styles.input}
                      required
                      placeholder="e.g. Weekend Shift"
                      value={formData.shift_name}
                      onChange={(e) =>
                        setFormData({ ...formData, shift_name: e.target.value })
                      }
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Start Time *</label>
                    <input
                      type="time"
                      className={styles.input}
                      required
                      value={formData.start_time}
                      onChange={(e) =>
                        setFormData({ ...formData, start_time: e.target.value })
                      }
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label className={styles.label}>End Time *</label>
                    <input
                      type="time"
                      className={styles.input}
                      required
                      value={formData.end_time}
                      onChange={(e) =>
                        setFormData({ ...formData, end_time: e.target.value })
                      }
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Display Order</label>
                    <input
                      type="number"
                      className={styles.input}
                      value={formData.display_order}
                      onChange={(e) =>
                        setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Badge Color</label>
                    <select
                      className={styles.select}
                      value={formData.badge_color}
                      onChange={(e) =>
                        setFormData({ ...formData, badge_color: e.target.value })
                      }
                    >
                      {BADGE_COLORS.map(c => (
                         <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                    <label className={styles.label}>Description</label>
                    <textarea
                      className={styles.textarea}
                      placeholder="Additional notes about this shift..."
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                    ></textarea>
                  </div>
                  
                  <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                    <label className={styles.checkboxContainer}>
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={formData.is_night_shift}
                        onChange={(e) =>
                          setFormData({ ...formData, is_night_shift: e.target.checked })
                        }
                      />
                      <span className={styles.label} style={{ marginBottom: 0 }}>This is a Night Shift (Spans across midnight)</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.btnCancel}
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.btnSave}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving..." : "Save Shift"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
