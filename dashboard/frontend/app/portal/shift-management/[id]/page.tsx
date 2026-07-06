"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import styles from "./page.module.css";
import DashboardLayout from "@/components/DashboardLayout";
import Link from "next/link";
import { ArrowLeft, Clock, Users } from "lucide-react";

interface Shift {
  id: string;
  shift_code: string;
  shift_name: string;
  start_time: string;
  end_time: string;
  is_night_shift: boolean;
  badge_color: string;
  is_active: boolean;
  description: string;
}

interface Nurse {
  id: string;
  employee_id: string;
  full_name: string;
  department: string;
  status: string;
}

export default function ShiftDetailsPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const supabase = createClient();

  const [shift, setShift] = useState<Shift | null>(null);
  const [nurses, setNurses] = useState<Nurse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchShiftDetails();
  }, [id]);

  const fetchShiftDetails = async () => {
    setIsLoading(true);
    
    // Fetch shift
    const { data: shiftData, error: shiftError } = await supabase
      .from("shifts")
      .select("*")
      .eq("id", id)
      .single();

    if (shiftError || !shiftData) {
      console.error("Error fetching shift:", shiftError);
      alert("Shift not found");
      router.push("/portal/shift-management");
      return;
    }
    setShift(shiftData);

    // Fetch assigned nurses
    const { data: nursesData, error: nursesError } = await supabase
      .from("nurses")
      .select("id, employee_id, full_name, department, status")
      .eq("shift_id", id);

    if (nursesError) {
      console.error("Error fetching assigned nurses:", nursesError);
    } else {
      setNurses(nursesData || []);
    }

    setIsLoading(false);
  };

  if (isLoading || !shift) {
    return (
      <DashboardLayout hideSidebar>
        <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
          Loading shift details...
        </div>
      </DashboardLayout>
    );
  }

  const calculateDuration = (start: string, end: string, isNight: boolean) => {
    if (!start || !end) return "-";
    const parseTime = (timeStr: string) => {
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + (m || 0);
    };
    let sMin = parseTime(start);
    let eMin = parseTime(end);
    let diff = eMin - sMin;
    if (diff < 0 || isNight) diff += 24 * 60;
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

  const activeStaffCount = nurses.filter(n => n.status === "Active").length;

  return (
    <DashboardLayout hideSidebar>
      <div className={styles.container}>
        <div className={styles.header}>
          <Link href="/portal/shift-management" className={styles.backLink}>
            <ArrowLeft size={16} />
            Back to Shift Management
          </Link>
        </div>

        <div className={styles.profileCard}>
          <div className={styles.profileSidebar}>
            <div className={styles.iconContainer}>
              <Clock size={40} style={{ color: "var(--primary-color, #3b82f6)" }} />
            </div>
            <h1 className={styles.name}>{shift.shift_name}</h1>
            <p className={styles.title}>{shift.shift_code}</p>
            
            <span className={`${styles.badge} ${shift.is_active ? styles.badgeActive : styles.badgeInactive}`}>
              {shift.is_active ? "Active" : "Inactive"}
            </span>

            <div style={{ marginTop: 16, width: "100%", textAlign: "center" }}>
               <span className={`${styles.badge} ${getBadgeClass(shift.badge_color)}`} style={{ marginBottom: 0 }}>
                 Badge Preview
               </span>
            </div>
          </div>

          <div className={styles.profileDetails}>
            <h2 className={styles.sectionTitle}>
              Shift Information
            </h2>
            <div className={styles.detailsGrid}>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Start Time</span>
                <span className={styles.detailValue}>{formatTime(shift.start_time)}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>End Time</span>
                <span className={styles.detailValue}>{formatTime(shift.end_time)}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Duration</span>
                <span className={styles.detailValue}>{calculateDuration(shift.start_time, shift.end_time, shift.is_night_shift)}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Night Shift</span>
                <span className={styles.detailValue}>{shift.is_night_shift ? "Yes" : "No"}</span>
              </div>
            </div>

            {shift.description && (
              <div style={{ marginBottom: 32 }}>
                <span className={styles.detailLabel} style={{ display: 'block', marginBottom: 8 }}>Description</span>
                <p style={{ margin: 0, fontSize: 14, color: '#334155', lineHeight: 1.5 }}>
                  {shift.description}
                </p>
              </div>
            )}
            
            <h2 className={styles.sectionTitle} style={{ marginTop: 40, borderTop: '1px solid #e2e8f0', paddingTop: 32 }}>
               <Users size={18} />
               Assigned Staff ({nurses.length} Total, {activeStaffCount} Active)
            </h2>
            
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Employee ID</th>
                    <th>Name</th>
                    <th>Role/Department</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {nurses.length === 0 ? (
                    <tr>
                      <td colSpan={4}>
                        <div className={styles.emptyState}>
                          No staff members are currently assigned to this shift.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    nurses.map(nurse => (
                      <tr key={nurse.id}>
                        <td>{nurse.employee_id}</td>
                        <td style={{ fontWeight: 500 }}>
                           <Link href={`/portal/nurse-management/${nurse.id}`} style={{ textDecoration: 'none', color: '#0f172a' }}>
                              {nurse.full_name}
                           </Link>
                        </td>
                        <td>Nurse - {nurse.department}</td>
                        <td>
                          <span className={nurse.status === 'Active' ? styles.badgeActive : styles.badgeInactive} style={{ padding: '4px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>
                            {nurse.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
