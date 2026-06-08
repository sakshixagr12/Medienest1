"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useClinic } from "@/context/ClinicContext";
import { createClient } from "@/lib/supabase/client";
import { displayDoctorName } from "@/lib/utils";
import PortalNavbar from "@/components/PortalNavbar";
import styles from "./page.module.css";

export default function PortalPage() {
  const { clinic, doctors, loading: clinicLoading } = useClinic();
  const [showDoctorSelect, setShowDoctorSelect] = useState(false);
  const [metrics, setMetrics] = useState({
    patients: 0,
    prescriptions: 0,
    followups: 0,
    revenue: 0,
  });
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const hospitalName = clinic?.name || "MedieNest Partner Clinic";
  const hospitalLocation = clinic?.address || "Location not set";

  useEffect(() => {
    if (!clinic?.id) return;

    const fetchData = async () => {
      const supabase = createClient();
      const today = new Date().toISOString().split("T")[0];

      try {
        // 1. Fetch Metrics (Total Clinic)
        const { count: pCount } = await supabase
          .from("prescriptions")
          .select("*", { count: "exact", head: true })
          .eq("date", today)
          .eq("clinic_id", clinic.id);
        const { data: receipts } = await supabase
          .from("receipts")
          .select("total_amount")
          .gte("printed_at", today)
          .eq("clinic_id", clinic.id);
        const { count: followupCount } = await supabase
          .from("prescriptions")
          .select("*", { count: "exact", head: true })
          .eq("clinic_id", clinic.id)
          .not("valid_till", "is", null)
          .gte("valid_till", today);

        const rev =
          receipts?.reduce((sum, r) => sum + (r.total_amount || 0), 0) || 0;

        setMetrics({
          patients: pCount || 0,
          prescriptions: pCount || 0,
          followups: followupCount || 0,
          revenue: rev,
        });

        // 2. Fetch Recent Activities
        const { data: recentRx } = await supabase
          .from("prescriptions")
          .select("id, created_at, patients(name)")
          .eq("clinic_id", clinic.id)
          .order("created_at", { ascending: false })
          .limit(4);

        if (recentRx) {
          const acts = recentRx.map((rx) => ({
            id: rx.id,
            type: "prescription",
            text: `Prescription created for ${(Array.isArray(rx.patients) ? rx.patients[0]?.name : (rx.patients as any)?.name) || "Patient"}`,
            time: new Date(rx.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          }));
          setActivities(acts);
        }
      } catch (err) {
        console.error("Error fetching portal data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [clinic]);

  if (clinicLoading) return null;

  return (
    <>
      <PortalNavbar />
      <div className={styles.page}>
        {/* Top Right Mockup Leaves Branch */}
        <div className={styles.leavesCornerWrapper}>
          <Image
            src="/assets/leaves_branch_corner.png"
            alt="Foliage branch decoration"
            width={580}
            height={360}
            className={styles.leavesCorner}
            priority
          />
        </div>

        <header className={styles.identityHeader}>
          <p className={styles.welcomeLabel}>WELCOME BACK,</p>
          <h1 className={styles.hospitalName}>{hospitalName}</h1>
          <div className={styles.location}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className={styles.locationPin}
            >
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>{hospitalLocation}</span>
          </div>
        </header>

        {/* Metrics Overview */}
        <section className={styles.metricsGrid}>
          <div className={styles.metricCard}>
            <div className={styles.metricIcon} style={{ background: '#eaf3ea', color: '#2e7d32' }}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div className={styles.metricInfo}>
              <p>PATIENTS TODAY</p>
              <h3>{metrics.patients}</h3>
              <span className={styles.trendText}>+0% from yesterday</span>
            </div>
          </div>

          <div className={styles.metricDivider} />

          <div className={styles.metricCard}>
            <div className={styles.metricIcon} style={{ background: '#e0f2fe', color: '#0284c7' }}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <div className={styles.metricInfo}>
              <p>PRESCRIPTIONS</p>
              <h3>{metrics.prescriptions}</h3>
              <span className={styles.trendText}>+0% from yesterday</span>
            </div>
          </div>

          <div className={styles.metricDivider} />

          <div className={styles.metricCard}>
            <div className={styles.metricIcon} style={{ background: '#f3e8ff', color: '#7c3aed' }}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div className={styles.metricInfo}>
              <p>FOLLOW-UPS</p>
              <h3>{metrics.followups}</h3>
              <span className={styles.trendText}>+0% from yesterday</span>
            </div>
          </div>

          <div className={styles.metricDivider} />

          <div className={styles.metricCard}>
            <div className={styles.metricIcon} style={{ background: '#fef3c7', color: '#d97706' }}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
            </div>
            <div className={styles.metricInfo}>
              <p>REVENUE</p>
              <h3>₹{metrics.revenue.toLocaleString()}</h3>
              <span className={styles.trendText}>+0% from yesterday</span>
            </div>
          </div>
        </section>

        {/* Selection Cards Grid with 3D Assets */}
        <main className={styles.selectionShell}>
          <div
            className={styles.portalCardLarge}
            onClick={() => setShowDoctorSelect(true)}
            style={{ cursor: "pointer" }}
          >
            <div className={styles.cardContent}>
              <div className={styles.iconBoxPrimary} style={{ background: '#eaf3ea', color: '#2e7d32' }}>
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                </svg>
              </div>
              <div className={styles.cardBody}>
                <h2>Doctor Dashboard</h2>
                <p>
                  View patients, prescriptions, AI summaries, and insights — all in one place.
                </p>
                <div className={styles.ctaAction} style={{ color: '#2e7d32' }}>
                  <span>Open Dashboard</span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  >
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </div>
              </div>
              <div className={styles.cardRightImage}>
                <Image
                  src="/assets/3d_clipboard.png"
                  alt="Doctor Dashboard Clipboard"
                  width={140}
                  height={140}
                  className={styles.illustration3d}
                />
              </div>
            </div>
          </div>

          <Link href="/portal/front-desk" className={styles.portalCardLarge}>
            <div className={styles.cardContent}>
              <div className={styles.iconBoxSecondary} style={{ background: '#f3e8ff', color: '#7c3aed' }}>
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <div className={styles.cardBody}>
                <h2>Front Desk</h2>
                <p>
                  Manage appointments, check-ins, and patient flow without chaos.
                </p>
                <div className={styles.ctaAction} style={{ color: '#7c3aed' }}>
                  <span>Manage Desk</span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  >
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </div>
              </div>
              <div className={styles.cardRightImage}>
                <Image
                  src="/assets/3d_calendar.png"
                  alt="Front Desk Calendar"
                  width={140}
                  height={140}
                  className={styles.illustration3d}
                />
              </div>
            </div>
          </Link>

          <Link href="/portal/billing-receipts" className={styles.portalCardLarge}>
            <div className={styles.cardContent}>
              <div className={styles.iconBoxSecondary} style={{ background: '#e6fffa', color: '#0d9488' }}>
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
              </div>
              <div className={styles.cardBody}>
                <h2>Billing & Payments</h2>
                <p>
                  Collect payments, print professional receipts, and track clinic revenue.
                </p>
                <div className={styles.ctaAction} style={{ color: '#0d9488' }}>
                  <span>Open Billing</span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  >
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </div>
              </div>
              <div className={styles.cardRightImage}>
                <Image
                  src="/assets/3d_receipt.png"
                  alt="Billing Receipt"
                  width={140}
                  height={140}
                  className={styles.illustration3d}
                />
              </div>
            </div>
          </Link>

          <Link href="/portal/clinic-settings" className={styles.portalCardLarge}>
            <div className={styles.cardContent}>
              <div className={styles.iconBoxSecondary} style={{ background: '#eef2ff', color: '#4f46e5' }}>
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.80.31l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .31-1.80 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.31-1.8l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.8.31 1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.8-.31l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.31 1.80 1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </div>
              <div className={styles.cardBody}>
                <h2>Clinic Settings</h2>
                <p>
                  Update clinic details, add doctors, and manage system preferences.
                </p>
                <div className={styles.ctaAction} style={{ color: '#4f46e5' }}>
                  <span>Edit Settings</span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  >
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </div>
              </div>
              <div className={styles.cardRightImage}>
                <Image
                  src="/assets/3d_shield.png"
                  alt="Settings Shield"
                  width={140}
                  height={140}
                  className={styles.illustration3d}
                />
              </div>
            </div>
          </Link>
        </main>

        {showDoctorSelect && (
          <div
            className={styles.modalOverlay}
            onClick={() => setShowDoctorSelect(false)}
          >
            <div
              className={styles.doctorModal}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                className={styles.closeBtn}
                onClick={() => setShowDoctorSelect(false)}
                aria-label="Close"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                </svg>
              </button>

              {/* Header */}
              <div className={styles.modalTop}>
                <div className={styles.modalLogoCircle}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <h3 className={styles.modalTitle}>Select Consulting Doctor</h3>

                <div className={styles.heartSeparator}>
                  <span className={styles.separatorLine} />
                  <span className={styles.heartIcon}>💚</span>
                  <span className={styles.separatorLine} />
                </div>

                <p className={styles.modalSubtext}>
                  {doctors.length} doctor{doctors.length !== 1 ? "s" : ""} available at {hospitalName}
                </p>
              </div>

              {/* Doctor List */}
              <div className={styles.doctorList}>
                {doctors.map((doc, idx) => (
                  <Link
                    key={doc.id}
                    href={`/portal/doctor-dashboard?doctorId=${doc.doctor_id || doc.id}&doctorName=${encodeURIComponent(doc.name)}`}
                    className={styles.doctorItem}
                    style={{ animationDelay: `${idx * 80}ms` }}
                  >
                    <div className={styles.doctorAvatar}>
                      {doc.name.charAt(0).toUpperCase()}
                    </div>
                    <div className={styles.doctorInfo}>
                      <h4>{displayDoctorName(doc.name)}</h4>
                      <span className={styles.specialtyBadge}>
                        {doc.specialty || "Medical Officer"}
                      </span>
                    </div>
                    <div className={styles.doctorArrow}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Footer */}
              <div className={styles.modalFooter}>
                <div className={styles.heartSeparatorGrey}>
                  <span className={styles.separatorLine} />
                  <span className={styles.heartIconGrey}>❤</span>
                  <span className={styles.separatorLine} />
                </div>
                <p className={styles.modalFooterText}>MedieNest · Compassion. Care. Connected.</p>
              </div>
            </div>
          </div>
        )}

        <section className={styles.activityFeed}>
          <div className={styles.activityHeader}>
            <div className={styles.activityLabel}>
              <span className={styles.dot} /> RECENT ACTIVITY
            </div>
            <Link href="/portal/front-desk/analytics" className={styles.viewAllLink}>
              <span>View All Activity</span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className={styles.viewAllArrow}
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </Link>
          </div>

          <div className={styles.activityList}>
            {activities.length > 0 ? (
              activities.map((act) => (
                <div key={act.id} className={styles.activityRow}>
                  <div className={styles.activityRowLeft}>
                    <div className={styles.actIconBox} style={{ background: '#eaf3ea', color: '#2e7d32' }}>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                      >
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    </div>
                    <p>{act.text}</p>
                  </div>
                  <span className={styles.actTime}>{act.time}</span>
                </div>
              ))
            ) : (
              <div className={styles.activityRow}>
                <div className={styles.activityRowLeft}>
                  <div className={styles.actIconBox} style={{ background: '#f3e8ff', color: '#7c3aed' }}>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </div>
                  <p>No recent activity record found for today.</p>
                </div>
              </div>
            )}
          </div>
        </section>

        <footer className={styles.portalFooter}>
          Authorized personnel only. Clinic Operating System v2.4. MedieNest ensures data privacy for all clinic records.
        </footer>
      </div>
    </>
  );
}
