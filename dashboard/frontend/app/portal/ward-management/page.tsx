"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./page.module.css";
import TopBar from "@/components/TopBar";

interface Ward {
  id: string;
  ward_code: string;
  ward_name: string;
  ward_type: string;
  floor: string;
  capacity: number;
  description: string;
  is_active: boolean;
}

const WARD_TYPES = [
  "General",
  "Private",
  "Semi Private",
  "ICU",
  "NICU",
  "Emergency",
  "HDU",
];

export default function WardManagementPage() {
  const supabase = createClient();
  const [wards, setWards] = useState<Ward[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  // Form State
  const [formData, setFormData] = useState<Partial<Ward>>({
    ward_code: "",
    ward_name: "",
    ward_type: "General",
    floor: "",
    capacity: 0,
    description: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchWards();
  }, []);

  const fetchWards = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("wards")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching wards:", error.message, error);
    } else {
      setWards(data || []);
    }
    setIsLoading(false);
  };

  const handleOpenModal = (ward?: Ward) => {
    if (ward) {
      setEditingId(ward.id);
      setFormData({
        ward_code: ward.ward_code,
        ward_name: ward.ward_name,
        ward_type: ward.ward_type,
        floor: ward.floor,
        capacity: ward.capacity,
        description: ward.description || "",
      });
    } else {
      setEditingId(null);
      setFormData({
        ward_code: "",
        ward_name: "",
        ward_type: "General",
        floor: "",
        capacity: 0,
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
      // Check for duplicate ward code (exclude current ward if editing)
      const { data: existing } = await supabase
        .from("wards")
        .select("id")
        .eq("ward_code", formData.ward_code)
        .eq("is_active", true)
        .neq("id", editingId || "00000000-0000-0000-0000-000000000000");

      if (existing && existing.length > 0) {
        setErrorMsg("A ward with this Ward Code already exists.");
        setIsSubmitting(false);
        return;
      }

      if (editingId) {
        // Update
        const { error } = await supabase
          .from("wards")
          .update({
            ward_code: formData.ward_code,
            ward_name: formData.ward_name,
            ward_type: formData.ward_type,
            floor: formData.floor,
            capacity: formData.capacity,
            description: formData.description,
          })
          .eq("id", editingId);

        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase.from("wards").insert([
          {
            ward_code: formData.ward_code,
            ward_name: formData.ward_name,
            ward_type: formData.ward_type,
            floor: formData.floor,
            capacity: formData.capacity,
            description: formData.description,
          },
        ]);

        if (error) throw error;
      }

      fetchWards();
      handleCloseModal();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "An error occurred while saving.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this ward?")) return;

    try {
      // Soft delete
      const { error } = await supabase
        .from("wards")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
      fetchWards();
    } catch (err) {
      console.error("Error deleting ward:", err);
      alert("Failed to delete ward.");
    }
  };

  // Filtering
  const filteredWards = wards.filter((ward) =>
    ward.ward_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ward.ward_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination Logic
  const totalPages = Math.ceil(filteredWards.length / itemsPerPage);
  const paginatedWards = filteredWards.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Stats Logic
  const totalWards = wards.length;
  const activeWards = wards.filter(w => w.is_active).length;
  const inactiveWards = wards.filter(w => !w.is_active).length;
  const totalCapacity = wards.filter(w => w.is_active).reduce((sum, w) => sum + w.capacity, 0);

  // Reset to page 1 on search
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const getBadgeClass = (type: string) => {
    switch (type) {
      case "ICU":
      case "NICU":
      case "HDU":
        return styles.badgeICU;
      case "Emergency":
        return styles.badgeEmergency;
      case "Private":
      case "Semi Private":
        return styles.badgePrivate;
      case "General":
        return styles.badgeGeneral;
      default:
        return styles.badgeOther;
    }
  };

  return (
    <div className="pageWrapper" style={{ minHeight: "100vh", background: "var(--sanctuary-bg)" }}>
      <TopBar title="Ward Management" backHref="/portal/settings" />
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Wards</h1>
          <div className={styles.headerActions}>
            <input
              type="text"
              placeholder="Search by name or code..."
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
              Add Ward
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.iconBlue}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{totalWards}</span>
              <span className={styles.statLabel}>Total Wards</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.iconGreen}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{activeWards}</span>
              <span className={styles.statLabel}>Active Wards</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.iconRed}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="9" x2="15" y2="15"></line><line x1="15" y1="9" x2="9" y2="15"></line></svg>
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{inactiveWards}</span>
              <span className={styles.statLabel}>Inactive Wards</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.iconPurple}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{totalCapacity}</span>
              <span className={styles.statLabel}>Total Capacity</span>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className={styles.emptyState}>Loading wards...</div>
        ) : filteredWards.length === 0 ? (
          <div className={styles.emptyState}>
            No wards found. Click "Add Ward" to create one.
          </div>
        ) : (
          <>
            <div className={styles.grid}>
              {paginatedWards.map((ward) => (
                <div key={ward.id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div>
                      <div className={styles.cardTitle}>{ward.ward_name}</div>
                      <div className={styles.wardCode}>{ward.ward_code}</div>
                    </div>
                    <span
                      className={`${styles.badge} ${getBadgeClass(
                        ward.ward_type
                      )}`}
                    >
                      {ward.ward_type}
                    </span>
                  </div>
                  <div className={styles.cardBody}>
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Floor</span>
                      <span className={styles.infoValue}>{ward.floor}</span>
                    </div>
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Capacity</span>
                      <span className={styles.infoValue}>{ward.capacity} Beds</span>
                    </div>
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Status</span>
                      <span
                        className={styles.infoValue}
                        style={{ color: "#16a34a" }}
                      >
                        Active
                      </span>
                    </div>
                  </div>
                  <div className={styles.cardActions}>
                    <button
                      className={styles.btnEdit}
                      onClick={() => handleOpenModal(ward)}
                    >
                      Edit
                    </button>
                    <button
                      className={styles.btnDelete}
                      onClick={() => handleDelete(ward.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  className={styles.pageBtn}
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  Previous
                </button>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#64748b",
                  }}
                >
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  className={styles.pageBtn}
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {editingId ? "Edit Ward" : "Add New Ward"}
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
              <div className={styles.formGroup}>
                <label className={styles.label}>Ward Code *</label>
                <input
                  type="text"
                  className={styles.input}
                  required
                  placeholder="e.g. ICU-01"
                  value={formData.ward_code}
                  onChange={(e) =>
                    setFormData({ ...formData, ward_code: e.target.value })
                  }
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Ward Name *</label>
                <input
                  type="text"
                  className={styles.input}
                  required
                  placeholder="e.g. Intensive Care Unit"
                  value={formData.ward_name}
                  onChange={(e) =>
                    setFormData({ ...formData, ward_name: e.target.value })
                  }
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Ward Type *</label>
                  <select
                    className={styles.select}
                    required
                    value={formData.ward_type}
                    onChange={(e) =>
                      setFormData({ ...formData, ward_type: e.target.value })
                    }
                  >
                    {WARD_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Floor *</label>
                  <input
                    type="text"
                    className={styles.input}
                    required
                    placeholder="e.g. 2nd Floor"
                    value={formData.floor}
                    onChange={(e) =>
                      setFormData({ ...formData, floor: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Capacity (Total Beds) *</label>
                <input
                  type="number"
                  min="0"
                  className={styles.input}
                  required
                  value={formData.capacity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      capacity: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Description</label>
                <textarea
                  className={styles.textarea}
                  placeholder="Additional notes about this ward..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                ></textarea>
              </div>

              {errorMsg && <div className={styles.errorText}>{errorMsg}</div>}

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
                  {isSubmitting ? "Saving..." : "Save Ward"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
