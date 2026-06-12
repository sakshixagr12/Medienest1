"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useClinic } from "@/context/ClinicContext";
import { createClient } from "@/lib/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { getLocalTodayStr, displayDoctorName, normalizeDoctorName } from "@/lib/utils";
import styles from "./page.module.css";

const IconPatientHistory = (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const IconWait = (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

export default function DoctorPage() {
  const searchParams = useSearchParams();
  const doctorId = searchParams.get("doctorId");
  const doctorNameParam = searchParams.get("doctorName");

  const { doctors, clinic, user, refresh } = useClinic();
  const [metricsData, setMetricsData] = useState({ todayCount: 0, revenue: 0 });
  const [liveQueue, setLiveQueue] = useState<any[]>([]);
  const [todayPatients, setTodayPatients] = useState<any[]>([]);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [analytics, setAnalytics] = useState({
    today: 0,
    week: 0,
    month: 0,
    waitingTotal: 0,
    waitingEmergency: 0,
    waitingGeneral: 0,
    avgTime: 0,
  });
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [remainingExpanded, setRemainingExpanded] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Doctor switcher and add modal states
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false);
  const [isAddDoctorMode, setIsAddDoctorMode] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [isLoadingSub, setIsLoadingSub] = useState(true);
  const [newDocName, setNewDocName] = useState("");
  const [newDocSpecialty, setNewDocSpecialty] = useState("");
  const [newDocQual, setNewDocQual] = useState("");
  const [newDocContact, setNewDocContact] = useState("");
  const [newDocRegNumber, setNewDocRegNumber] = useState("");
  const [newDocExpiry, setNewDocExpiry] = useState("");
  const [newDocPhoto, setNewDocPhoto] = useState("");
  const [isAddingDoc, setIsAddingDoc] = useState(false);

  // Stable Supabase client — never recreated between renders
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  // Fetch subscription details
  useEffect(() => {
    if (!clinic?.id) return;
    const fetchSubscription = async () => {
      setIsLoadingSub(true);
      try {
        const { data, error } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("clinic_id", clinic.id)
          .maybeSingle();

        if (error) throw error;
        setSubscription(data);
      } catch (e: any) {
        console.error("Error fetching subscription:", e.message);
      } finally {
        setIsLoadingSub(false);
      }
    };
    fetchSubscription();
  }, [clinic, supabase]);

  // Dynamic doctor limits
  let maxAllowedDoctors = 2;
  if (subscription) {
    if (subscription.plan_name === "Clinic") {
      maxAllowedDoctors = 5;
    } else if (subscription.plan_name === "Professional") {
      maxAllowedDoctors = 999;
    }
  }

  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinic?.id) return;
    if (doctors && doctors.length >= maxAllowedDoctors) {
      alert(`Clinic Limit Reached: Maximum ${maxAllowedDoctors} doctors allowed on your current plan.`);
      return;
    }
    if (!newDocName.trim()) {
      alert("Doctor name is required.");
      return;
    }
    if (!newDocRegNumber.trim()) {
      alert("Medical License Number is required.");
      return;
    }

    setIsAddingDoc(true);
    try {
      const normalizedName = normalizeDoctorName(newDocName);
      const { data: newDoc, error: docErr } = await supabase
        .from("doctors")
        .insert([
          {
            name: normalizedName,
            specialty: newDocSpecialty || "General Consultant",
            qualification: newDocQual,
            contact: newDocContact.trim(),
            registration_number: newDocRegNumber.trim(),
            license_expiry_date: newDocExpiry || null,
            profile_photo_url: newDocPhoto.trim() || null,
          },
        ])
        .select()
        .single();

      if (docErr) throw docErr;

      const { error: mapErr } = await supabase.from("clinic_doctors").insert([
        {
          clinic_id: clinic.id,
          doctor_id: newDoc.id,
          is_active: true,
        },
      ]);

      if (mapErr) throw mapErr;

      setNewDocName("");
      setNewDocSpecialty("");
      setNewDocQual("");
      setNewDocContact("");
      setNewDocRegNumber("");
      setNewDocExpiry("");
      setNewDocPhoto("");
      setIsAddDoctorMode(false);
      await refresh();
      alert(`Dr. ${normalizedName} added to the clinic staff!`);
    } catch (e: any) {
      alert("Error adding doctor: " + e.message);
    } finally {
      setIsAddingDoc(false);
    }
  };

  const [activeDoctorId, setActiveDoctorId] = useState<string | null>(null);
  const [activeDoctorName, setActiveDoctorName] = useState<string>("Doctor");

  const currentUserDoctor = doctors?.find(
    (d) =>
      (d.user_id && user?.id && d.user_id === user.id) ||
      (d.email && user?.email && d.email.toLowerCase() === user.email.toLowerCase()) ||
      (d.contact_email && user?.email && d.contact_email.toLowerCase() === user.email.toLowerCase())
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const paramId = searchParams.get("doctorId");
    const paramName = searchParams.get("doctorName");

    if (paramId) {
      sessionStorage.setItem("dash_doctorId", paramId);
    }
    if (paramName) {
      sessionStorage.setItem("dash_doctorName", paramName);
    }

    if (paramId || paramName) {
      // Clean query parameters from address bar to hide the long IDs
      window.history.replaceState(null, "", window.location.pathname);
    }

    const savedId = sessionStorage.getItem("dash_doctorId") || paramId;
    const savedName = sessionStorage.getItem("dash_doctorName") || paramName;

    const finalId =
      savedId ||
      currentUserDoctor?.doctor_id ||
      currentUserDoctor?.id ||
      (doctors && doctors.length > 0 ? doctors[0].doctor_id || doctors[0].id : null);

    const finalName =
      savedName ||
      currentUserDoctor?.name ||
      (doctors && doctors.length > 0 ? doctors[0].name : "Doctor");

    setActiveDoctorId(finalId);
    setActiveDoctorName(finalName);
  }, [searchParams, doctors, user, currentUserDoctor]);

  const doctorDisplayName = displayDoctorName(activeDoctorName);
  const doctorFirstName =
    doctorDisplayName.split(" ").slice(1, 2).join("") ||
    doctorDisplayName.split(" ")[1] ||
    doctorDisplayName;

  const getDoctorUrl = (baseHref: string) => {
    if (!doctorId) return baseHref;
    const url = new URL(baseHref, "http://localhost");
    url.searchParams.set("doctorId", doctorId);
    url.searchParams.set("doctorName", activeDoctorName);
    return `${url.pathname}${url.search}`;
  };

  // ── Fetch live queue from doctor_queue ──────────────────────────────

  const fetchQueue = useCallback(async () => {
    if (!clinic?.id || !activeDoctorId) return;
    const todayStr = getLocalTodayStr();

    // Step 1: Get all active queue rows for today scoped to clinic & doctor
    let query = supabase
      .from("doctor_queue")
      .select("*")
      .eq("clinic_id", clinic.id)
      .eq("queue_date", todayStr)
      .in("status", ["waiting", "serving"]);

    if (activeDoctorId) {
      query = query.eq("doctor_id", activeDoctorId);
    }

    const { data: qRows, error: qErr } = await query.order("token_number", { ascending: true });

    if (qErr || !qRows || qRows.length === 0) {
      setLiveQueue(qRows ?? []);
      return;
    }

    // Auto-call logic: if no patient is currently being served, automatically call the first waiting patient
    const hasServing = qRows.some((r: any) => r.status === "serving");
    const firstWaiting = qRows.find((r: any) => r.status === "waiting");

    if (!hasServing && firstWaiting) {
      await supabase
        .from("doctor_queue")
        .update({ status: "serving" })
        .eq("id", firstWaiting.id);
      fetchQueue();
      return;
    }


    // Step 2: Fetch patient details separately (avoids silent join failures)
    const patientIds = [
      ...new Set(qRows.map((r: any) => r.patient_id).filter(Boolean)),
    ];
    const { data: ptRows } = await supabase
      .from("patients")
      .select("id, name, gender, age, contact, blood_group, weight")
      .in("id", patientIds);

    const ptMap: Record<string, any> = {};
    ptRows?.forEach((p: any) => {
      ptMap[p.id] = p;
    });

    // Step 3: Merge patient data into queue rows
    const merged = qRows.map((r: any) => ({
      ...r,
      patients: ptMap[r.patient_id] ?? {
        name: r.patient_name ?? "Unknown",
        gender: "",
        age: "",
      },
    }));

    setLiveQueue(merged);
  }, [clinic?.id, activeDoctorId, supabase]);

  // ── Fetch stats ──────────────────────────────────────────────────────
  useEffect(() => {
    const fetchStats = async () => {
      if (!clinic?.id || !activeDoctorId) return;
      const todayStr = getLocalTodayStr();

      // Count completed patients in doctor_queue for this doctor today
      let queueQuery = supabase
        .from("doctor_queue")
        .select("id", { count: "exact", head: true })
        .eq("queue_date", todayStr)
        .eq("clinic_id", clinic.id)
        .eq("status", "done");
      if (activeDoctorId) queueQuery = queueQuery.eq("doctor_id", activeDoctorId);
      const { count: qCount } = await queueQuery;

      let revenueQuery = supabase
        .from("receipts")
        .select("total_amount")
        .gte("printed_at", todayStr)
        .eq("clinic_id", clinic.id);
      if (activeDoctorName)
        revenueQuery = revenueQuery.eq("doctor_name", activeDoctorName);
      const { data: receipts } = await revenueQuery;
      const rev =
        receipts?.reduce((s: number, r: any) => s + (r.total_amount || 0), 0) ||
        0;

      setMetricsData({ todayCount: qCount || 0, revenue: rev });
    };
    fetchStats();
  }, [clinic, activeDoctorId, activeDoctorName, supabase]);

  // ── Fetch today's completed patients ──────────────────────────────
  const fetchTodayPatients = useCallback(async () => {
    if (!clinic?.id || !activeDoctorId) return;
    const todayStr = getLocalTodayStr();
    let query = supabase
      .from("doctor_queue")
      .select("*")
      .eq("clinic_id", clinic.id)
      .eq("queue_date", todayStr)
      .in("status", ["done", "skipped"]);
    if (activeDoctorId) {
      query = query.eq("doctor_id", activeDoctorId);
    }
    const { data } = await query.order("completed_at", { ascending: false });
    if (data) setTodayPatients(data);
  }, [clinic?.id, activeDoctorId, supabase]);

  // ── Fetch clinical analytics ─────────────────────────────────────────
  const fetchAnalytics = useCallback(async () => {
    if (!clinic?.id || !activeDoctorId) return;
    const todayStr = getLocalTodayStr();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    let rxTodayQuery = supabase.from("prescriptions").select("id", { count: "exact", head: true }).gte("created_at", startOfToday.toISOString()).eq("clinic_id", clinic.id);
    let rxWeekQuery = supabase.from("prescriptions").select("id", { count: "exact", head: true }).gte("created_at", startOfWeek.toISOString()).eq("clinic_id", clinic.id);
    let rxMonthQuery = supabase.from("prescriptions").select("id", { count: "exact", head: true }).gte("created_at", startOfMonth.toISOString()).eq("clinic_id", clinic.id);

    if (activeDoctorId) {
      rxTodayQuery = rxTodayQuery.eq("doctor_id", activeDoctorId);
      rxWeekQuery = rxWeekQuery.eq("doctor_id", activeDoctorId);
      rxMonthQuery = rxMonthQuery.eq("doctor_id", activeDoctorId);
    }

    const [{ count: cToday }, { count: cWeek }, { count: cMonth }] =
      await Promise.all([rxTodayQuery, rxWeekQuery, rxMonthQuery]);

    let queueQuery = supabase
      .from("doctor_queue")
      .select("priority")
      .eq("queue_date", todayStr)
      .eq("clinic_id", clinic.id)
      .eq("status", "waiting");
    if (activeDoctorId) {
      queueQuery = queueQuery.eq("doctor_id", activeDoctorId);
    }
    const { data: qData } = await queueQuery;

    const emergency =
      qData?.filter((q: any) => q.priority === "urgent").length || 0;
    const general = (qData?.length || 0) - emergency;

    let avgQuery = supabase
      .from("prescriptions")
      .select("created_at")
      .gte("created_at", startOfToday.toISOString())
      .eq("clinic_id", clinic.id)
      .order("created_at", { ascending: true });
    if (activeDoctorId) {
      avgQuery = avgQuery.eq("doctor_id", activeDoctorId);
    }
    const { data: tData } = await avgQuery;

    let avgTime = 0;
    if (tData && tData.length > 1) {
      let total = 0,
        count = 0;
      for (let i = 0; i < tData.length - 1; i++) {
        const gap =
          (new Date(tData[i + 1].created_at).getTime() -
            new Date(tData[i].created_at).getTime()) /
          60000;
        if (gap < 60) {
          total += gap;
          count++;
        }
      }
      avgTime = count > 0 ? Math.round(total / count) : 0;
    }
    setAnalytics({
      today: cToday || 0,
      week: cWeek || 0,
      month: cMonth || 0,
      waitingTotal: qData?.length || 0,
      waitingEmergency: emergency,
      waitingGeneral: general,
      avgTime,
    });
  }, [clinic?.id, activeDoctorId, supabase]);


  useEffect(() => {
    if (!clinic?.id) return;
    fetchQueue();
    fetchTodayPatients();
    fetchAnalytics();

    const channel = supabase
      .channel(`doctor-dash-queue-${clinic.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "doctor_queue",
          filter: `clinic_id=eq.${clinic.id}`,
        },
        () => {
          fetchQueue();
          fetchTodayPatients();
          fetchAnalytics();
        },
      )
      .subscribe();
    const poll = setInterval(() => {
      fetchQueue();
      fetchTodayPatients();
      fetchAnalytics();
    }, 8000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [clinic?.id, activeDoctorId, fetchQueue, fetchTodayPatients, fetchAnalytics]);

  // ── Elapsed timer for current patient ───────────────────────────────
  useEffect(() => {
    const current = liveQueue[0];
    if (!current) return;
    let startTime = new Date(current.created_at).getTime();
    if (isNaN(startTime) && current.check_in_time) {
      const match = current.check_in_time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (match) {
        const today = new Date();
        let hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        const ampm = match[3].toUpperCase();
        if (ampm === "PM" && hours < 12) hours += 12;
        if (ampm === "AM" && hours === 12) hours = 0;
        today.setHours(hours, minutes, 0, 0);
        startTime = today.getTime();
      }
    }
    if (isNaN(startTime)) {
      startTime = Date.now() - 12 * 60 * 1000;
    }
    const tick = () =>
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [liveQueue]);

  const formatElapsed = (secs: number) => {
    if (isNaN(secs) || secs < 0) {
      return "12m 34s";
    }
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const estimateWait = (index: number) => {
    let waitSeconds = elapsedSeconds;
    if (isNaN(waitSeconds) || waitSeconds < 0) {
      waitSeconds = 12 * 60;
    }
    const mins = (index + 1) * 10 - Math.floor((waitSeconds % 600) / 60);
    const finalMins = isNaN(mins) ? (index + 1) * 10 : Math.max(1, mins);
    return `~${finalMins} min`;
  };

  // ── Done: mark status=done → realtime removes from queue view ───────
  const handleDone = async (queueId: string) => {
    setActionLoading(queueId);
    try {
      await supabase
        .from("doctor_queue")
        .update({ status: "done", completed_at: new Date().toISOString() })
        .eq("id", queueId);
      // Realtime subscription auto-refreshes both dashboards
    } finally {
      setActionLoading(null);
    }
  };

  // ── Remove: hard delete from queue ──────────────────────────────────
  const handleRemove = async (queueId: string) => {
    setActionLoading(queueId);
    try {
      await supabase.from("doctor_queue").delete().eq("id", queueId);
    } finally {
      setActionLoading(null);
    }
  };

  const nowServing = liveQueue[0];
  const waitingList = liveQueue.slice(1);

  const metrics = [
    {
      label: "Patient History",
      value: `${todayPatients.length} Seen Today`,
      trend: "View completed sessions →",
      trendColor: "#8b5cf6",
      icon: IconPatientHistory,
      bg: "#ebdcff",
      onClick: () => setShowHistoryPanel((p) => !p),
    },
    {
      label: "Waiting",
      value: `${waitingList.length} Patients`,
      trend: "Queue Status",
      trendColor: "#10b981",
      icon: IconWait,
      bg: "#ffdeaa",
      onClick: undefined,
    },
    {
      label: "Patient Census",
      value: `${analytics.today} Today`,
      trend: `${analytics.week} Week · ${analytics.month} Month`,
      trendColor: "#0ea5e9",
      icon: (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M18 20V10" />
          <path d="M12 20V4" />
          <path d="M6 20v-6" />
        </svg>
      ),
      bg: "#dbeafe",
      onClick: undefined,
    },
  ];

  return (
    <DashboardLayout>
      {/* Desktop Welcoming Header */}
      <div className={`${styles.dashboardHeader} ${styles.desktopOnly}`}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
          <div>
            <h2>Welcome back, {doctorDisplayName}.</h2>
            <p>You&apos;ve seen {metricsData.todayCount} patient{metricsData.todayCount !== 1 ? "s" : ""} today.</p>
          </div>
        </div>
      </div>

      {/* Mobile Welcoming Header */}
      <div className={`${styles.dashboardHeader} ${styles.mobileOnly}`} style={{ position: "relative" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
          <h2>
            Welcome back,
            <br />
            <span className={styles.doctorNameHighlight}>{doctorDisplayName}</span>
            <span className={styles.wavingHand}>👋</span>
          </h2>
        </div>
        <p>
          You&apos;ve seen <span className={styles.purpleHighlight}>{metricsData.todayCount}</span> patient{metricsData.todayCount !== 1 ? "s" : ""} today.
        </p>
      </div>

      <div className={styles.fullWidthLayout}>
        <div className={styles.mainCol}>
          {/* Desktop-only Metrics Grid */}
          <div className={`${styles.metricsRow} ${styles.desktopOnly}`}>
            {metrics.map((m) => (
              <div
                key={m.label}
                className={styles.metricCard}
                onClick={m.onClick}
                style={{
                  cursor: m.onClick ? "pointer" : "default",
                  transition: "box-shadow 0.2s",
                }}
              >
                <div
                  className={styles.metricIcon}
                  style={{ backgroundColor: m.bg }}
                >
                  <div style={{ color: "var(--sanctuary-primary)" }}>
                    {m.icon}
                  </div>
                </div>
                <div>
                  <p className={styles.metricLabel}>{m.label}</p>
                  {m.label === "Patient Census" ? (
                    <div className={styles.censusRow}>
                      <div className={styles.censusItem}>
                        <h3 className={styles.metricValue}>{analytics.today}</h3>
                        <span className={styles.censusLabel}>Today</span>
                      </div>
                      <div className={styles.censusItem}>
                        <h3 className={styles.metricValue}>{analytics.week}</h3>
                        <span className={styles.censusLabel}>Week</span>
                      </div>
                      <div className={styles.censusItem}>
                        <h3 className={styles.metricValue}>{analytics.month}</h3>
                        <span className={styles.censusLabel}>Month</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h3 className={styles.metricValue}>{m.value}</h3>
                      <p
                        className={styles.metricTrend}
                        style={{ color: m.trendColor }}
                      >
                        {m.trend}
                      </p>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Mobile-only Metrics Row */}
          <div className={`${styles.topMetricsGrid} ${styles.mobileOnly}`}>
            {/* Card 1: Patients Seen */}
            <div
              className={styles.metricCardBig}
              onClick={() => setShowHistoryPanel((p) => !p)}
              style={{ cursor: "pointer" }}
            >
              <div className={styles.metricCardHeader}>
                <div className={styles.metricIconBox} style={{ backgroundColor: "#f3e8ff" }}>
                  <div style={{ color: "#8b5cf6" }}>
                    {IconPatientHistory}
                  </div>
                </div>
                <div className={styles.metricTextGroup}>
                  <span className={styles.metricMiniLabel}>PATIENTS SEEN</span>
                  <h3 className={styles.metricBigValue}>{todayPatients.length}</h3>
                  <span className={styles.metricSubLabel}>Today</span>
                </div>
              </div>
              <div className={styles.metricActionLink} style={{ color: "#8b5cf6" }}>
                View completed sessions &rarr;
              </div>
              <div className={styles.cardWavyBg} />
            </div>

            {/* Card 2: Waiting */}
            <div className={styles.metricCardBig}>
              <div className={styles.metricCardHeader}>
                <div className={styles.metricIconBox} style={{ backgroundColor: "#ffedd5" }}>
                  <div style={{ color: "#f97316" }}>
                    {IconWait}
                  </div>
                </div>
                <div className={styles.metricTextGroup}>
                  <span className={styles.metricMiniLabel}>WAITING</span>
                  <h3 className={styles.metricBigValue}>{waitingList.length}</h3>
                  <span className={styles.metricSubLabel}>Patients</span>
                </div>
              </div>
              <div className={styles.metricActionLink} style={{ color: "#10b981" }}>
                Queue Status
              </div>
              <div className={styles.cardWavyBgOrange} />
            </div>
          </div>

          {/* Mobile-only Card 3: Patient Census (Full Width) */}
          <div className={`${styles.censusFullWidthCard} ${styles.mobileOnly}`}>
            <div className={styles.censusLeft}>
              <div className={styles.censusIconBox}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M18 20V10" />
                  <path d="M12 20V4" />
                  <path d="M6 20v-6" />
                </svg>
              </div>
              <span className={styles.censusLabelText}>PATIENT CENSUS</span>
            </div>
            <div className={styles.censusRight}>
              <div className={styles.censusBlock}>
                <span className={styles.censusNum}>{analytics.today}</span>
                <span className={styles.censusSub}>Today</span>
              </div>
              <div className={styles.censusDivider} />
              <div className={styles.censusBlock}>
                <span className={styles.censusNum}>{analytics.week}</span>
                <span className={styles.censusSub}>Week</span>
              </div>
              <div className={styles.censusDivider} />
              <div className={styles.censusBlock}>
                <span className={styles.censusNum}>{analytics.month}</span>
                <span className={styles.censusSub}>Month</span>
              </div>
            </div>
          </div>



          {/* Today's Patient History Panel */}
          {showHistoryPanel && (
            <div
              style={{
                background: "#fff",
                borderRadius: 20,
                border: "1px solid rgba(23,3,55,0.06)",
                boxShadow: "0 4px 20px rgba(23,3,55,0.06)",
                overflow: "hidden",
                marginBottom: 4,
              }}
            >
              <div
                style={{
                  padding: "18px 24px",
                  borderBottom: "1px solid rgba(23,3,55,0.06)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <h4
                    style={{
                      fontWeight: 800,
                      fontSize: 16,
                      color: "var(--sanctuary-primary)",
                      margin: 0,
                    }}
                  >
                    Today's Completed Sessions
                  </h4>
                  <p
                    style={{
                      fontSize: 12,
                      color: "var(--sanctuary-ink-l)",
                      marginTop: 4,
                    }}
                  >
                    {todayPatients.length} patient
                    {todayPatients.length !== 1 ? "s" : ""} seen today
                  </p>
                </div>
                <button
                  onClick={() => setShowHistoryPanel(false)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 20,
                    color: "#94a3b8",
                    lineHeight: 1,
                  }}
                >
                  &times;
                </button>
              </div>
              {todayPatients.length === 0 ? (
                <div
                  style={{
                    padding: "32px",
                    textAlign: "center",
                    color: "var(--sanctuary-ink-l)",
                    fontSize: 14,
                  }}
                >
                  No completed sessions yet today.
                </div>
              ) : (
                <div style={{ maxHeight: 340, overflowY: "auto" }}>
                  {todayPatients.map((p, idx) => (
                    <div
                      key={p.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        padding: "14px 24px",
                        borderBottom: "1px solid rgba(23,3,55,0.04)",
                      }}
                    >
                      {/* Token */}
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: "50%",
                          flexShrink: 0,
                          background:
                            p.status === "done"
                              ? "linear-gradient(135deg,#10b981,#059669)"
                              : "#f1f5f9",
                          color: p.status === "done" ? "#fff" : "#94a3b8",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 800,
                          fontSize: 12,
                        }}
                      >
                        #{p.token_number ?? idx + 1}
                      </div>
                      {/* Info */}
                      <div style={{ flex: 1 }}>
                        <p
                          style={{
                            fontWeight: 700,
                            fontSize: 14,
                            color: "var(--sanctuary-primary)",
                            marginBottom: 2,
                          }}
                        >
                          {p.patient_name ?? "Unknown"}
                        </p>
                        <p
                          style={{
                            fontSize: 11,
                            color: "var(--sanctuary-ink-l)",
                          }}
                        >
                          {p.status === "done" ? "Completed" : "⏭ Skipped"}
                          {p.completed_at
                            ? ` · ${new Date(p.completed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                            : ""}
                          {p.priority !== "normal"
                            ? ` · ${p.priority === "urgent" ? "Urgent" : "Elderly"}`
                            : ""}
                        </p>
                      </div>
                      {/* View prescription */}
                      {p.patient_id && (
                        <a
                          href={getDoctorUrl(`/demo1/portal/doctor-dashboard/patients/${p.patient_id}`)}
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: "var(--sanctuary-primary)",
                            background: "var(--sanctuary-lavender, #ebdcff)",
                            padding: "5px 12px",
                            borderRadius: 20,
                            textDecoration: "none",
                            whiteSpace: "nowrap",
                          }}
                        >
                          View Profile
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Active Queue */}
          <div className={styles.sectionBox}>
            <div className={styles.sectionHeader}>
              <div>
                <h4>Active Queue</h4>
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--sanctuary-ink-l)",
                    marginTop: 4,
                  }}
                >
                  {liveQueue.length} patient{liveQueue.length !== 1 ? "s" : ""}{" "}
                  in queue today
                </p>
              </div>
              <span className={styles.livePill}>
                <span className={styles.liveDot} />
                LIVE
              </span>
            </div>

            {liveQueue.length === 0 ? (
              <div
                style={{
                  padding: "40px 0",
                  textAlign: "center",
                  color: "var(--sanctuary-ink-l)",
                }}
              >
                <p>No patients in queue yet today.</p>
              </div>
            ) : (
              <div className={styles.activeQueue}>
                {/* Now Serving — Done & Remove buttons */}
                {nowServing && (
                  <div className={styles.nowServingCard}>
                    <div className={styles.queueBadgeRow}>
                      <span className={styles.dotRed} />
                      <span className={styles.queueTierLabel}>Now Serving</span>
                      {nowServing.priority === "urgent" && (
                        <span
                          style={{
                            marginLeft: 8,
                            fontSize: 11,
                            fontWeight: 800,
                            color: "#ef4444",
                            background: "#fee2e2",
                            padding: "2px 8px",
                            borderRadius: 20,
                          }}
                        >
                          URGENT
                        </span>
                      )}
                    </div>
                    <div
                      className={styles.nowServingBody}
                      style={{ display: "flex", alignItems: "center", gap: 0 }}
                    >
                      {/* Clickable patient info → prescription */}
                      <Link
                        href={`/demo1/portal/digital-prescription?patientId=${nowServing.patient_id}&doctorName=${activeDoctorName}&ptName=${encodeURIComponent(nowServing.patients?.name || "")}&ptPhone=${nowServing.patients?.contact || ""}&ptAge=${nowServing.patients?.age || ""}&ptSex=${nowServing.patients?.gender || "Male"}&ptBloodGroup=${nowServing.patients?.blood_group || ""}${doctorId ? `&doctorId=${doctorId}` : ""}`}
                        style={{
                          textDecoration: "none",
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                          flex: 1,
                        }}
                      >
                        <div className={styles.nowServingAvatar}>
                          {nowServing.patients?.name?.[0] ?? "?"}
                        </div>
                        <div className={styles.nowServingInfo}>
                          <p className={styles.nowServingName}>
                            {nowServing.patients?.name ?? "Unknown"}
                          </p>
                          <p className={styles.nowServingMeta}>
                            {nowServing.patients?.age}Y&nbsp;•&nbsp;
                            {nowServing.patients?.gender}
                            {nowServing.patients?.blood_group
                              ? ` • ${nowServing.patients.blood_group}`
                              : ""}
                          </p>
                        </div>
                        <div className={styles.timerBadge}>
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          {formatElapsed(elapsedSeconds)}
                        </div>
                      </Link>

                      {/* Done + Remove + View Profile */}
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          marginLeft: 14,
                          flexShrink: 0,
                        }}
                      >
                        <Link
                          href={getDoctorUrl(`/demo1/portal/doctor-dashboard/patients/${nowServing.patient_id}`)}
                          title="View full patient profile"
                          style={{
                            background: "var(--sanctuary-gray-low)",
                            color: "var(--sanctuary-primary)",
                            border: "1.5px solid rgba(23,3,55,0.08)",
                            borderRadius: 10,
                            padding: "8px 13px",
                            fontWeight: 700,
                            fontSize: 13,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            textDecoration: "none",
                            transition: "all 0.2s",
                          }}
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          >
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                          Profile
                        </Link>
                        <button
                          onClick={() => handleDone(nowServing.id)}
                          disabled={actionLoading === nowServing.id}
                          title="Mark Done — next patient becomes current"
                          style={{
                            background: "#10b981",
                            color: "#fff",
                            border: "none",
                            borderRadius: 10,
                            padding: "8px 16px",
                            fontWeight: 800,
                            fontSize: 13,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            opacity: actionLoading === nowServing.id ? 0.5 : 1,
                            transition: "all 0.2s",
                          }}
                        >
                          <svg
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Done
                        </button>
                        <button
                          onClick={() => handleRemove(nowServing.id)}
                          disabled={actionLoading === nowServing.id}
                          title="Remove from queue"
                          style={{
                            background: "#fee2e2",
                            color: "#dc2626",
                            border: "none",
                            borderRadius: 10,
                            padding: "8px 13px",
                            fontWeight: 800,
                            fontSize: 14,
                            cursor: "pointer",
                            opacity: actionLoading === nowServing.id ? 0.5 : 1,
                            transition: "all 0.2s",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            flexShrink: 0,
                            whiteSpace: "nowrap",
                          }}
                        >
                          <svg
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                          >
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Waiting — Next 3 */}
                {waitingList.length > 0 && (
                  <div className={styles.waitingSection}>
                    <div className={styles.queueBadgeRow}>
                      <span className={styles.dotYellow} />
                      <span className={styles.queueTierLabel}>
                        Waiting — Next {Math.min(waitingList.length, 3)}
                      </span>
                    </div>
                    <div className={styles.waitingList}>
                      {waitingList.slice(0, 3).map((p, idx) => (
                        <div key={p.id} className={styles.waitingItem}>
                          <div className={styles.waitingToken}>#{idx + 2}</div>
                          <div className={styles.waitingInfo}>
                            <p className={styles.waitingName}>
                              {p.patients?.name ?? "Unknown"}
                            </p>
                            <p className={styles.waitingMeta}>
                              {p.patients?.age}Y&nbsp;•&nbsp;
                              {p.patients?.gender}
                            </p>
                          </div>
                          <div className={styles.waitEstimate}>
                            {estimateWait(idx)}
                          </div>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <Link
                              href={getDoctorUrl(`/demo1/portal/doctor-dashboard/patients/${p.patient_id}`)}
                              className={styles.waitingViewBtn}
                              title="View Profile"
                            >
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            </Link>
                            <Link
                              href={`/demo1/portal/digital-prescription?patientId=${p.patient_id}&doctorName=${activeDoctorName}&ptName=${encodeURIComponent(p.patients?.name || "")}&ptPhone=${p.patients?.contact || ""}&ptAge=${p.patients?.age || ""}&ptSex=${p.patients?.gender || "Male"}&ptBloodGroup=${p.patients?.blood_group || ""}${doctorId ? `&doctorId=${doctorId}` : ""}`}
                              className={styles.waitingViewBtn}
                              style={{ color: "var(--sanctuary-primary)" }}
                              title="Write Prescription"
                            >
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Remaining Queue */}
                {waitingList.slice(3).length > 0 && (
                  <div className={styles.remainingSection}>
                    <button
                      className={styles.remainingToggle}
                      onClick={() => setRemainingExpanded((prev) => !prev)}
                    >
                      <div
                        className={styles.queueBadgeRow}
                        style={{ margin: 0 }}
                      >
                        <span className={styles.dotGray} />
                        <span className={styles.queueTierLabel}>
                          Remaining Queue ({waitingList.slice(3).length})
                        </span>
                      </div>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        style={{
                          transform: remainingExpanded
                            ? "rotate(180deg)"
                            : "rotate(0deg)",
                          transition: "transform 0.3s",
                        }}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                    {remainingExpanded && (
                      <div className={styles.remainingList}>
                        {waitingList.slice(3).map((p, idx) => (
                          <div key={p.id} className={styles.remainingItem}>
                            <span className={styles.remainingToken}>
                              #{idx + 5}
                            </span>
                            <span className={styles.remainingName}>
                              {p.patients?.name ?? "Unknown"}
                            </span>
                            <span className={styles.remainingTime}>
                              {new Date(p.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Clinical Analytics ── */}
        <div style={{ marginTop: 4 }}>
          {/* Desktop-only Clinical Intelligence */}
          <div className={styles.desktopOnly}>
            <h4
              style={{
                fontWeight: 800,
                fontSize: 15,
                color: "var(--sanctuary-primary)",
                marginBottom: 14,
                letterSpacing: "-0.3px",
              }}
            >
              Clinical Intelligence
            </h4>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 14,
                marginBottom: 24,
              }}
            >
              {/* Active Queue Breakdown */}
              <div
                style={{
                  background: "#fff",
                  borderRadius: 18,
                  padding: "18px 20px",
                  border: "1px solid rgba(23,3,55,0.05)",
                  boxShadow: "0 2px 10px rgba(23,3,55,0.04)",
                }}
              >
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    color: "var(--sanctuary-ink-l)",
                    marginBottom: 10,
                  }}
                >
                  Active Queue
                </p>
                <div style={{ display: "flex", gap: 16, marginBottom: 6 }}>
                  <div>
                    <p
                      style={{
                        fontSize: 24,
                        fontWeight: 900,
                        color: "#ef4444",
                        lineHeight: 1,
                      }}
                    >
                      {analytics.waitingEmergency}
                    </p>
                    <p
                      style={{
                        fontSize: 11,
                        color: "var(--sanctuary-ink-l)",
                        marginTop: 2,
                      }}
                    >
                      Emergency
                    </p>
                  </div>
                  <div style={{ width: 1, background: "rgba(23,3,55,0.07)" }} />
                  <div>
                    <p
                      style={{
                        fontSize: 24,
                        fontWeight: 900,
                        color: "var(--sanctuary-primary)",
                        lineHeight: 1,
                      }}
                    >
                      {analytics.waitingGeneral}
                    </p>
                    <p
                      style={{
                        fontSize: 11,
                        color: "var(--sanctuary-ink-l)",
                        marginTop: 2,
                      }}
                    >
                      General
                    </p>
                  </div>
                </div>
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--sanctuary-ink-l)",
                    fontWeight: 600,
                  }}
                >
                  {analytics.waitingTotal} Pending
                </p>
              </div>

              {/* Avg Consult Time */}
              <div
                style={{
                  background: "#fff",
                  borderRadius: 18,
                  padding: "18px 20px",
                  border: "1px solid rgba(23,3,55,0.05)",
                  boxShadow: "0 2px 10px rgba(23,3,55,0.04)",
                }}
              >
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    color: "var(--sanctuary-ink-l)",
                    marginBottom: 10,
                  }}
                >
                  Avg Consult
                </p>
                <p
                  style={{
                    fontSize: 36,
                    fontWeight: 900,
                    color: "var(--sanctuary-primary)",
                    lineHeight: 1,
                  }}
                >
                  {analytics.avgTime}
                  <span style={{ fontSize: 16, fontWeight: 600, marginLeft: 2 }}>
                    m
                  </span>
                </p>
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--sanctuary-ink-l)",
                    marginTop: 6,
                    fontWeight: 600,
                  }}
                >
                  Minutes per Patient
                </p>
              </div>

              {/* Patient Census */}
              <div
                style={{
                  background: "#fff",
                  borderRadius: 18,
                  padding: "18px 20px",
                  border: "1px solid rgba(23,3,55,0.05)",
                  boxShadow: "0 2px 10px rgba(23,3,55,0.04)",
                }}
              >
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    color: "var(--sanctuary-ink-l)",
                    marginBottom: 10,
                  }}
                >
                  Patient Census
                </p>
                <div style={{ display: "flex", gap: 14 }}>
                  {[
                    ["Today", analytics.today],
                    ["Week", analytics.week],
                    ["Month", analytics.month],
                  ].map(([label, val]) => (
                    <div key={label as string}>
                      <p
                        style={{
                          fontSize: 22,
                          fontWeight: 900,
                          color: "var(--sanctuary-primary)",
                          lineHeight: 1,
                        }}
                      >
                        {val}
                      </p>
                      <p
                        style={{
                          fontSize: 11,
                          color: "var(--sanctuary-ink-l)",
                          marginTop: 2,
                        }}
                      >
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Mobile-only Clinical Intelligence */}
          <div className={styles.mobileOnly}>
            <h4
              style={{
                fontWeight: 800,
                fontSize: 15,
                color: "var(--sanctuary-primary)",
                marginBottom: 14,
                letterSpacing: "-0.3px",
              }}
            >
              Clinical Intelligence
            </h4>
            <div className={styles.intelligenceGrid}>
              {/* Card 1: Active Queue */}
              <div className={styles.intelligenceCard}>
                <div className={styles.intelligenceIcon}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                  </svg>
                </div>
                <div className={styles.intelligenceInfo}>
                  <span className={styles.intelligenceLabel}>ACTIVE QUEUE</span>
                  <span className={styles.intelligenceValue}>{analytics.waitingTotal}</span>
                </div>
              </div>

              {/* Card 2: Avg Consult */}
              <div className={styles.intelligenceCard}>
                <div className={styles.intelligenceIcon}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M4.8 2.3A.3.3 0 1 0 4.8 2.9a2 2 0 0 1 2 2v6.6a5.2 5.2 0 0 0 10.4 0V4.9a2 2 0 0 1 2-2 .3.3 0 1 0 0-.6" />
                    <circle cx="12" cy="18" r="4" />
                    <path d="M12 14v4" />
                  </svg>
                </div>
                <div className={styles.intelligenceInfo}>
                  <span className={styles.intelligenceLabel}>AVG CONSULT</span>
                  <span className={styles.intelligenceValue}>{analytics.avgTime}</span>
                  <span className={styles.intelligenceSub}>Minutes</span>
                </div>
              </div>

              {/* Card 3: Patients Seen */}
              <div className={styles.intelligenceCard}>
                <div className={styles.intelligenceIcon}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                </div>
                <div className={styles.intelligenceInfo}>
                  <span className={styles.intelligenceLabel}>PATIENTS SEEN</span>
                  <span className={styles.intelligenceValue}>{todayPatients.length}</span>
                  <span className={styles.intelligenceSub}>Today</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isAddDoctorMode && (
        <div
          className={styles.modalOverlay}
          onClick={() => setIsAddDoctorMode(false)}
        >
          <div
            className={`${styles.doctorModal} ${styles.addDocModalWidth}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              className={styles.closeBtn}
              onClick={() => setIsAddDoctorMode(false)}
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6 6 18" /><path d="m6 6 12 12" />
              </svg>
            </button>

            <form onSubmit={handleAddDoctor} className={styles.modalAddForm}>
              {/* Header */}
              <div className={styles.modalTop}>
                <div className={styles.modalLogoCircle} style={{ background: "#E0F2FE", color: "#0284C7", borderColor: "rgba(2, 132, 199, 0.4)" }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0284C7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <line x1="19" y1="8" x2="19" y2="14" />
                    <line x1="16" y1="11" x2="22" y2="11" />
                  </svg>
                </div>
                <h3 className={styles.modalTitle}>Add New Doctor</h3>

                <div className={styles.heartSeparator}>
                  <span className={styles.separatorLine} />
                  <span className={styles.heartIcon} style={{ color: "#0284c7" }}>💙</span>
                  <span className={styles.separatorLine} />
                </div>

                <p className={styles.modalSubtext}>
                  Add doctor to {clinic?.name || "clinic"} ({doctors.length}/{maxAllowedDoctors} active)
                </p>
              </div>

              {/* Form fields scrollable */}
              <div className={styles.formFieldsScroll}>
                <div className={styles.modalFormField}>
                  <label>Doctor's Name <span style={{ color: "#EF4444" }}>*</span></label>
                  <input
                    type="text"
                    value={newDocName}
                    onChange={(e) => setNewDocName(e.target.value)}
                    placeholder="e.g. Dr. Ramesh Gupta"
                    required
                    className={styles.modalInput}
                  />
                </div>

                <div className={styles.modalFormField}>
                  <label>Specialty</label>
                  <input
                    type="text"
                    value={newDocSpecialty}
                    onChange={(e) => setNewDocSpecialty(e.target.value)}
                    placeholder="e.g. Pediatrics"
                    className={styles.modalInput}
                  />
                </div>

                <div className={styles.modalFormField}>
                  <label>Qualification</label>
                  <input
                    type="text"
                    value={newDocQual}
                    onChange={(e) => setNewDocQual(e.target.value)}
                    placeholder="e.g. MBBS, MD"
                    className={styles.modalInput}
                  />
                </div>

                <div className={styles.modalFormField}>
                  <label>Contact Number</label>
                  <input
                    type="text"
                    value={newDocContact}
                    onChange={(e) => setNewDocContact(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className={styles.modalInput}
                  />
                </div>

                <div className={styles.modalFormField}>
                  <label>Medical License No. <span style={{ color: "#EF4444" }}>*</span></label>
                  <input
                    type="text"
                    value={newDocRegNumber}
                    onChange={(e) => setNewDocRegNumber(e.target.value)}
                    placeholder="e.g. MCI-12345"
                    required
                    className={styles.modalInput}
                  />
                </div>

                <div className={styles.modalFormField}>
                  <label>License Expiry Date</label>
                  <input
                    type="date"
                    value={newDocExpiry}
                    onChange={(e) => setNewDocExpiry(e.target.value)}
                    className={styles.modalInput}
                  />
                </div>

                <div className={styles.modalFormField}>
                  <label>Profile Photo URL</label>
                  <input
                    type="text"
                    value={newDocPhoto}
                    onChange={(e) => setNewDocPhoto(e.target.value)}
                    placeholder="https://example.com/photo.jpg"
                    className={styles.modalInput}
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className={styles.formActions}>
                <button
                  type="button"
                  onClick={() => setIsAddDoctorMode(false)}
                  disabled={isAddingDoc}
                  className={styles.cancelBtn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingDoc}
                  className={styles.submitBtn}
                >
                  {isAddingDoc ? "Adding..." : "Add Doctor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
