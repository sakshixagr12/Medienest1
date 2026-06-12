"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useClinic } from "@/context/ClinicContext";
import { createClient } from "@/lib/supabase/client";
import PortalNavbar from "@/components/PortalNavbar";
import styles from "./page.module.css";

export default function StorePage() {
  const { clinic, loading: clinicLoading } = useClinic();
  const [metrics, setMetrics] = useState({
    receipts: 0,
    receiptsTrend: "+0% from yesterday",
    revenue: 0,
    revenueTrend: "+0% from yesterday",
  });
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const storeName = clinic?.name || "MedieNest Partner Store";
  const storeLocation = clinic?.address || "Location not set";

  useEffect(() => {
    if (!clinic?.id) return;

    const fetchData = async () => {
      const supabase = createClient();
      const today = new Date().toISOString().split("T")[0];
      const yesterdayDate = new Date();
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterday = yesterdayDate.toISOString().split("T")[0];

      try {
        // Fetch Receipts Created Today
        const { data: receipts, error: receiptsErr } = await supabase
          .from("receipts")
          .select("total_amount, printed_at")
          .gte("printed_at", today)
          .eq("clinic_id", clinic.id);

        if (receiptsErr) throw receiptsErr;

        // Fetch Receipts Created Yesterday
        const { data: receiptsYesterday } = await supabase
          .from("receipts")
          .select("total_amount, printed_at")
          .gte("printed_at", yesterday)
          .lt("printed_at", today)
          .eq("clinic_id", clinic.id);

        const rev =
          receipts?.reduce((sum: number, r: any) => sum + (r.total_amount || 0), 0) || 0;
        const revYesterday =
          receiptsYesterday?.reduce((sum: number, r: any) => sum + (r.total_amount || 0), 0) || 0;

        const calculateTrend = (todayVal: number, yesterdayVal: number) => {
          if (!yesterdayVal || yesterdayVal === 0) {
            return todayVal > 0 ? "+100% from yesterday" : "+0% from yesterday";
          }
          const pct = Math.round(((todayVal - yesterdayVal) / yesterdayVal) * 100);
          return pct >= 0 ? `+${pct}% from yesterday` : `${pct}% from yesterday`;
        };

        setMetrics({
          receipts: receipts?.length || 0,
          receiptsTrend: calculateTrend(receipts?.length || 0, receiptsYesterday?.length || 0),
          revenue: rev,
          revenueTrend: calculateTrend(rev, revYesterday),
        });

        // Fetch Recent Activities (Receipt creations)
        const { data: recentReceipts } = await supabase
          .from("receipts")
          .select("id, created_at, patient_name, total_amount")
          .eq("clinic_id", clinic.id)
          .order("created_at", { ascending: false })
          .limit(4);

        if (recentReceipts) {
          const acts = recentReceipts.map((r: any) => ({
            id: r.id,
            type: "receipt",
            text: `Invoice of ₹${r.total_amount} created for ${r.patient_name || "Walk-in Customer"}`,
            time: new Date(r.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          }));
          setActivities(acts);
        }
      } catch (err) {
        console.error("Error fetching store dashboard data:", err);
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
        {/* Foliage decoration */}
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
          <h1 className={styles.hospitalName}>{storeName}</h1>
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
            <span>{storeLocation}</span>
          </div>
        </header>

        {/* Metrics Grid */}
        <section className={styles.metricsGrid}>
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
              </svg>
            </div>
            <div className={styles.metricInfo}>
              <p>SALES TRANSACTIONS TODAY</p>
              <h3>{metrics.receipts}</h3>
              <span className={styles.trendText}>{metrics.receiptsTrend}</span>
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
              <p>STORE SALES REVENUE TODAY</p>
              <h3>₹{metrics.revenue.toLocaleString()}</h3>
              <span className={styles.trendText}>{metrics.revenueTrend}</span>
            </div>
          </div>
        </section>

        {/* Selection Cards Grid */}
        <main className={styles.selectionShell} style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
          <Link href="/demo1/store/billing-receipts" className={styles.portalCardLarge}>
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
                  Collect payments, print professional receipts, and track store revenue.
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

          <Link href="/demo1/store/day-summary" className={styles.portalCardLarge}>
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
                  <line x1="18" y1="20" x2="18" y2="10"></line>
                  <line x1="12" y1="20" x2="12" y2="4"></line>
                  <line x1="6" y1="20" x2="6" y2="14"></line>
                </svg>
              </div>
              <div className={styles.cardBody}>
                <h2>Sales Reports (Day Summary)</h2>
                <p>
                  Analyze store sales performance, view daily totals, and audit revenue.
                </p>
                <div className={styles.ctaAction} style={{ color: '#7c3aed' }}>
                  <span>View Reports</span>
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
                  alt="Reports Calendar"
                  width={140}
                  height={140}
                  className={styles.illustration3d}
                />
              </div>
            </div>
          </Link>

          <Link href="/demo1/store/clinic-settings" className={styles.portalCardLarge}>
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
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.80.31l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .31-1.80 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1-2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.31-1.8l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.8.31 1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.8-.31l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.31 1.80 1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </div>
              <div className={styles.cardBody}>
                <h2>Store Settings</h2>
                <p>
                  Update store details, manage subscription, and preferences.
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

        <section className={styles.activityFeed}>
          <div className={styles.activityHeader}>
            <div className={styles.activityLabel}>
              <span className={styles.dot} /> RECENT SALES
            </div>
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
                  <p>No sales recorded today.</p>
                </div>
              </div>
            )}
          </div>
        </section>

        <footer className={styles.portalFooter}>
          Authorized personnel only. Store Operating System v2.4. MedieNest ensures data privacy for all store records.
        </footer>
      </div>
    </>
  );
}
