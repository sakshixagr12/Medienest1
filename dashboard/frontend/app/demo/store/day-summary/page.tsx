"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import TopBar from "@/components/TopBar";
import { useClinic } from "@/context/ClinicContext";
import { createClient } from "@/lib/supabase/client";
import styles from "./page.module.css";

interface DailyStats {
  totalPatients: number;
  totalRevenue: number;
  cashRevenue: number;
  onlineRevenue: number;
  patients: any[];
  receipts: any[];
}

export default function DaySummaryPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{ padding: 100, textAlign: "center", color: "var(--ink-l)" }}
        >
          Loading report...
        </div>
      }
    >
      <DaySummary />
    </Suspense>
  );
}

function DaySummary() {
  const { clinic } = useClinic();
  const [stats, setStats] = useState<DailyStats>({
    totalPatients: 0,
    totalRevenue: 0,
    cashRevenue: 0,
    onlineRevenue: 0,
    patients: [],
    receipts: [],
  });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (clinic) {
      fetchDaySummary();
    }
  }, [clinic]);

  const fetchDaySummary = async () => {
    if (!clinic) return;
    setLoading(true);

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    try {
      // Fetch Today's Receipts (Revenue)
      const { data: billData, error: billErr } = await supabase
        .from("receipts")
        .select("*")
        .eq("clinic_id", clinic.id)
        .gte("printed_at", startOfDay.toISOString())
        .lte("printed_at", endOfDay.toISOString());

      if (billErr) {
        console.error("Bill Error Full:", billErr);
        console.error("Bill Message:", billErr.message);
      }

      const receipts = billData || [];
      const totalRevenue = receipts.reduce((sum: number, r: any) => sum + r.total_amount, 0);
      const cashRevenue = receipts
        .filter((r: any) => r.payment_mode === "Cash")
        .reduce((sum: number, r: any) => sum + r.total_amount, 0);
      const onlineRevenue = totalRevenue - cashRevenue;

      setStats({
        totalPatients: receipts.length,
        totalRevenue,
        cashRevenue,
        onlineRevenue,
        patients: [],
        receipts: receipts,
      });
    } catch (err) {
      console.error("Error fetching day summary:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <TopBar title="Store Day Summary" backHref="/demo/store" />

      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.titleArea}>
            <h1>Daily Revenue & Sales Report</h1>
            <p>
              {new Date().toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <button
            className={`${styles.refreshBtn} ${loading ? styles.refreshLoading : ""}`}
            onClick={fetchDaySummary}
            disabled={loading}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className={loading ? styles.spin : ""}
            >
              <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"></path>
            </svg>
            {loading ? "Updating..." : "Refresh Report"}
          </button>
        </header>

        <div className={styles.statsGrid}>
          <div className={styles.card}>
            <span className={styles.cardLabel}>Sales Count</span>
            <div className={styles.cardVal}>{stats.totalPatients}</div>
            <div className={styles.cardTrend}>Today's invoices</div>
          </div>
          <div className={`${styles.card} ${styles.revenueCard}`}>
            <span className={styles.cardLabel}>Total Collection</span>
            <div className={styles.cardVal}>
              ₹{stats.totalRevenue.toLocaleString()}
            </div>
            <div className={styles.paymentSplit}>
              <span>Cash: ₹{stats.cashRevenue}</span>
              <span>Online: ₹{stats.onlineRevenue}</span>
            </div>
          </div>
          <div className={styles.card}>
            <span className={styles.cardLabel}>Avg. Invoice Value</span>
            <div className={styles.cardVal}>
              ₹
              {stats.totalPatients > 0
                ? Math.round(stats.totalRevenue / stats.totalPatients)
                : 0}
            </div>
            <div className={styles.cardTrend}>Per order collection</div>
          </div>
        </div>

        <section className={styles.tableSection}>
          <h2 className={styles.sectionTitle}>Recent Invoices</h2>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Receipt #</th>
                  <th>Customer Name</th>
                  <th>Prescribed By</th>
                  <th>Mode</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {stats.receipts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className={styles.empty}>
                      No collections registered today.
                    </td>
                  </tr>
                ) : (
                  stats.receipts.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <code>{r.receipt_number}</code>
                      </td>
                      <td>{r.patient_name}</td>
                      <td>{r.doctor_name || "Self / None"}</td>
                      <td>
                        <span className={styles.modeBadge}>
                          {r.payment_mode}
                        </span>
                      </td>
                      <td style={{ textAlign: "right", fontWeight: "bold" }}>
                        ₹{r.total_amount}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
