"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import TopBar from "@/components/TopBar";
import styles from "./page.module.css";
import Link from "next/link";

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

interface Bed {
  id: string;
  ward_id: string;
  bed_number: string;
  bed_type: string;
  status: string;
  notes: string;
  created_at: string;
}

export default function WardDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const wardId = params.id as string;
  
  const [ward, setWard] = useState<Ward | null>(null);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const supabase = createClient();

  useEffect(() => {
    if (wardId) {
      fetchWardDetails();
    }
  }, [wardId]);

  const fetchWardDetails = async () => {
    setIsLoading(true);
    
    // Fetch Ward
    const { data: wardData, error: wardError } = await supabase
      .from("wards")
      .select("*")
      .eq("id", wardId)
      .single();

    if (wardError) {
      console.error("Error fetching ward:", wardError);
    } else {
      setWard(wardData);
    }

    // Fetch Beds for this ward
    const { data: bedsData, error: bedsError } = await supabase
      .from("beds")
      .select("*")
      .eq("ward_id", wardId)
      .order("bed_number", { ascending: true });

    if (bedsError) {
      console.error("Error fetching beds:", bedsError);
    } else {
      setBeds(bedsData || []);
    }

    setIsLoading(false);
  };

  // Stats
  const totalCapacity = ward?.capacity || 0;
  const availableBeds = beds.filter(b => b.status === "Available").length;
  const occupiedBeds = beds.filter(b => b.status === "Occupied").length;
  const cleaningBeds = beds.filter(b => b.status === "Cleaning").length;
  const maintenanceBeds = beds.filter(b => b.status === "Maintenance").length;

  const getStatusClass = (status: string) => {
    switch (status) {
      case "Available": return styles.statusAvailable;
      case "Occupied": return styles.statusOccupied;
      case "Cleaning": return styles.statusCleaning;
      case "Maintenance": return styles.statusMaintenance;
      case "Reserved": return styles.statusReserved;
      default: return styles.statusMaintenance;
    }
  };

  if (isLoading) {
    return (
      <div className="pageWrapper" style={{ minHeight: "100vh", background: "var(--sanctuary-bg)" }}>
        <TopBar title="Ward Details" backHref="/portal/ward-management" />
        <div className={styles.container}>
          <div className={styles.emptyState}>Loading ward details...</div>
        </div>
      </div>
    );
  }

  if (!ward) {
    return (
      <div className="pageWrapper" style={{ minHeight: "100vh", background: "var(--sanctuary-bg)" }}>
        <TopBar title="Ward Details" backHref="/portal/ward-management" />
        <div className={styles.container}>
          <div className={styles.emptyState}>Ward not found.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="pageWrapper" style={{ minHeight: "100vh", background: "var(--sanctuary-bg)" }}>
      <TopBar title="Ward Details" backHref="/portal/ward-management" />
      <div className={styles.container}>
        
        {/* Header Section */}
        <div className={styles.header}>
          <div className={styles.titleArea}>
            <h1 className={styles.title}>{ward.ward_name}</h1>
            <div className={styles.subtitle}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
              {ward.ward_code} • {ward.ward_type} • Floor {ward.floor}
              <span className={`${styles.badge} ${ward.is_active ? styles.badgeActive : styles.badgeInactive}`}>
                {ward.is_active ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
          <div className={styles.headerActions}>
            <Link href="/portal/bed-management" className={styles.btnAddBed}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Manage Beds
            </Link>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.iconPurple}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{totalCapacity}</span>
              <span className={styles.statLabel}>Total Capacity</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.iconGreen}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{availableBeds}</span>
              <span className={styles.statLabel}>Available Beds</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.iconRed}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="9" x2="15" y2="15"></line><line x1="15" y1="9" x2="9" y2="15"></line></svg>
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{occupiedBeds}</span>
              <span className={styles.statLabel}>Occupied Beds</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.iconOrange}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{cleaningBeds + maintenanceBeds}</span>
              <span className={styles.statLabel}>Clean / Maint</span>
            </div>
          </div>
        </div>

        {/* Beds Table */}
        <h2 className={styles.sectionTitle}>Beds inside {ward.ward_name}</h2>
        
        {beds.length === 0 ? (
          <div className={styles.emptyState}>
            No beds have been added to this ward yet. <br />
            <Link href="/portal/bed-management" style={{ color: "#3b82f6", textDecoration: "none", marginTop: "8px", display: "inline-block" }}>Go to Bed Management to add beds.</Link>
          </div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Bed Number</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {beds.map((bed) => (
                  <tr key={bed.id}>
                    <td>
                      <strong style={{ color: "#0f172a" }}>{bed.bed_number}</strong>
                    </td>
                    <td>{bed.bed_type}</td>
                    <td>
                      <span className={`${styles.bedStatus} ${getStatusClass(bed.status)}`}>
                        {bed.status}
                      </span>
                    </td>
                    <td style={{ color: "#64748b", maxWidth: "250px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {bed.notes || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}
