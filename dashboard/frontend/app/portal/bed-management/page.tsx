"use client";

import React, { useState, useEffect } from "react";
import TopBar from "@/components/TopBar";
import styles from "./page.module.css";
import { createClient } from "@/lib/supabase/client";
import { LogOut } from "lucide-react"; // for icon if needed

interface Ward {
  id: string;
  ward_name: string;
  ward_code: string;
}

interface Bed {
  id: string;
  ward_id: string;
  bed_number: string;
  bed_type: string;
  status: string;
  notes: string;
  created_at: string;
  ward_name?: string; // mapped client-side
}

export default function BedManagementPage() {
  const [beds, setBeds] = useState<Bed[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [wardFilter, setWardFilter] = useState("All");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const supabase = createClient();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    ward_id: "",
    bed_number: "",
    bed_type: "Standard",
    status: "Available",
    notes: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    // Fetch Wards for dropdowns and mapping
    const { data: wardsData, error: wardsError } = await supabase
      .from("wards")
      .select("id, ward_name, ward_code")
      .order("ward_name", { ascending: true });

    if (wardsError) {
      console.error("Error fetching wards:", wardsError.message);
    } else {
      setWards(wardsData || []);
    }

    // Fetch Beds
    const { data: bedsData, error: bedsError } = await supabase
      .from("beds")
      .select("*")
      .order("created_at", { ascending: false });

    if (bedsError) {
      console.error("Error fetching beds:", bedsError.message);
    } else {
      // Map ward_name into beds for easier display
      const mappedBeds = (bedsData || []).map((bed) => {
        const ward = (wardsData || []).find((w) => w.id === bed.ward_id);
        return {
          ...bed,
          ward_name: ward ? ward.ward_name : "Unknown Ward",
        };
      });
      setBeds(mappedBeds);
    }
    setIsLoading(false);
  };

  const handleOpenModal = (bed?: Bed) => {
    if (bed) {
      setEditingId(bed.id);
      setFormData({
        ward_id: bed.ward_id,
        bed_number: bed.bed_number,
        bed_type: bed.bed_type,
        status: bed.status,
        notes: bed.notes || "",
      });
    } else {
      setEditingId(null);
      setFormData({
        ward_id: wards.length > 0 ? wards[0].id : "",
        bed_number: "",
        bed_type: "Standard",
        status: "Available",
        notes: "",
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!formData.ward_id || !formData.bed_number.trim()) {
      alert("Ward and Bed Number are required.");
      return;
    }

    try {
      if (editingId) {
        const { error } = await supabase
          .from("beds")
          .update({
            ward_id: formData.ward_id,
            bed_number: formData.bed_number.trim(),
            bed_type: formData.bed_type,
            status: formData.status,
            notes: formData.notes,
          })
          .eq("id", editingId);

        if (error) {
          if (error.code === '23505') throw new Error("A bed with this number already exists in the selected ward.");
          throw error;
        }
      } else {
        const { error } = await supabase.from("beds").insert([
          {
            ward_id: formData.ward_id,
            bed_number: formData.bed_number.trim(),
            bed_type: formData.bed_type,
            status: formData.status,
            notes: formData.notes,
          },
        ]);

        if (error) {
           if (error.code === '23505') throw new Error("A bed with this number already exists in the selected ward.");
           throw error;
        }
      }

      handleCloseModal();
      fetchData(); // Refresh list
    } catch (err: any) {
      alert(err.message || "Failed to save bed. Please check the bed number.");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this bed?")) {
      const { error } = await supabase.from("beds").delete().eq("id", id);
      if (error) {
        alert("Failed to delete bed.");
        console.error(error);
      } else {
        fetchData();
      }
    }
  };

  // Filtering
  const filteredBeds = beds.filter((bed) => {
    const matchesSearch =
      bed.bed_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (bed.ward_name && bed.ward_name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === "All" || bed.status === statusFilter;
    const matchesWard = wardFilter === "All" || bed.ward_id === wardFilter;

    return matchesSearch && matchesStatus && matchesWard;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredBeds.length / itemsPerPage);
  const paginatedBeds = filteredBeds.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 on search or filter
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, wardFilter]);

  const getBadgeClass = (status: string) => {
    switch (status) {
      case "Available": return styles.badgeAvailable;
      case "Occupied": return styles.badgeOccupied;
      case "Reserved": return styles.badgeReserved;
      case "Cleaning": return styles.badgeCleaning;
      case "Maintenance": return styles.badgeMaintenance;
      default: return styles.badgeMaintenance;
    }
  };

  return (
    <div className="pageWrapper" style={{ minHeight: "100vh", background: "var(--sanctuary-bg)" }}>
      <TopBar title="Bed Management" backHref="/portal/settings" />
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Beds</h1>
          
          <div className={styles.headerActions}>
            <div className={styles.filters}>
              <select
                className={styles.filterSelect}
                value={wardFilter}
                onChange={(e) => setWardFilter(e.target.value)}
              >
                <option value="All">All Wards</option>
                {wards.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.ward_name}
                  </option>
                ))}
              </select>

              <select
                className={styles.filterSelect}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All Statuses</option>
                <option value="Available">Available</option>
                <option value="Occupied">Occupied</option>
                <option value="Reserved">Reserved</option>
                <option value="Cleaning">Cleaning</option>
                <option value="Maintenance">Maintenance</option>
              </select>
            </div>

            <input
              type="text"
              placeholder="Search bed number..."
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
              Add Bed
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className={styles.emptyState}>Loading beds...</div>
        ) : filteredBeds.length === 0 ? (
          <div className={styles.emptyState}>
            No beds found matching your search or filters.
          </div>
        ) : (
          <>
            <div className={styles.grid}>
              {paginatedBeds.map((bed) => (
                <div key={bed.id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div className={styles.bedInfo}>
                      <h3 className={styles.bedName}>Bed {bed.bed_number}</h3>
                      <div className={styles.bedCode}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                        {bed.ward_name}
                      </div>
                    </div>
                    <span className={`${styles.badge} ${getBadgeClass(bed.status)}`}>
                      {bed.status}
                    </span>
                  </div>

                  <div className={styles.detailsGrid}>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Type</span>
                      <span className={styles.detailValue}>{bed.bed_type}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Last Updated</span>
                      <span className={styles.detailValue}>
                        {new Date(bed.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {bed.notes && (
                    <div style={{ marginBottom: "16px", fontSize: "13px", color: "#64748b" }}>
                      <strong>Notes:</strong> {bed.notes}
                    </div>
                  )}

                  <div className={styles.actions}>
                    <button
                      className={styles.btnEdit}
                      onClick={() => handleOpenModal(bed)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                      Edit
                    </button>
                    <button
                      className={styles.btnDelete}
                      onClick={() => handleDelete(bed.id)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
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
                <span className={styles.pageInfo}>
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
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>{editingId ? "Edit Bed" : "Add New Bed"}</h2>
              <button className={styles.btnClose} onClick={handleCloseModal}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>Assign to Ward</label>
                <select
                  value={formData.ward_id}
                  onChange={(e) =>
                    setFormData({ ...formData, ward_id: e.target.value })
                  }
                  required
                >
                  {wards.length === 0 && <option value="">No wards available</option>}
                  {wards.map(w => (
                    <option key={w.id} value={w.id}>{w.ward_name}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Bed Number (e.g. B-101)</label>
                <input
                  type="text"
                  placeholder="B-101"
                  value={formData.bed_number}
                  onChange={(e) =>
                    setFormData({ ...formData, bed_number: e.target.value })
                  }
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Bed Type</label>
                <select
                  value={formData.bed_type}
                  onChange={(e) =>
                    setFormData({ ...formData, bed_type: e.target.value })
                  }
                  required
                >
                  <option value="Standard">Standard</option>
                  <option value="ICU Bed">ICU Bed</option>
                  <option value="Pediatric">Pediatric</option>
                  <option value="Bariatric">Bariatric</option>
                  <option value="Maternity">Maternity</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Current Status</label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  required
                >
                  <option value="Available">Available</option>
                  <option value="Occupied">Occupied</option>
                  <option value="Reserved">Reserved</option>
                  <option value="Cleaning">Cleaning</option>
                  <option value="Maintenance">Maintenance</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Notes (Optional)</label>
                <textarea
                  placeholder="Any maintenance requirements or special notes..."
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btnCancel} onClick={handleCloseModal}>
                Cancel
              </button>
              <button
                className={styles.btnSave}
                onClick={handleSave}
                disabled={!formData.ward_id || !formData.bed_number}
              >
                {editingId ? "Update Bed" : "Save Bed"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
