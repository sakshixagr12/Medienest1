'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getLocalTodayStr, getLocalWeekStartStr, getLocalMonthStartStr } from '@/lib/utils';
import styles from './DashboardSidebar.module.css';

interface SidebarAnalyticsProps {
  doctorId: string | null;
  doctorName: string;
  clinicId: string | null;
}

export default function SidebarAnalytics({ doctorId, doctorName, clinicId }: SidebarAnalyticsProps) {
  const [stats, setStats] = useState({
    today: 0,
    week: 0,
    month: 0,
    waitingTotal: 0,
    waitingEmergency: 0,
    waitingGeneral: 0,
    avgTime: 0
  });
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const fetchAnalytics = useCallback(async () => {
      setLoading(true);
      const todayStr = getLocalTodayStr();
      const weekStr = getLocalWeekStartStr();
      const monthStr = getLocalMonthStartStr();

      try {
        // 1. Patient Census Today/Week/Month
        let todayQuery = supabase.from('prescriptions').select('id', { count: 'exact', head: true }).eq('date', todayStr).eq('clinic_id', clinicId);
        if (doctorId) todayQuery = todayQuery.eq('doctor_id', doctorId);
        const { count: countToday } = await todayQuery;

        let weekQuery = supabase.from('prescriptions').select('id', { count: 'exact', head: true }).gte('date', weekStr).eq('clinic_id', clinicId);
        if (doctorId) weekQuery = weekQuery.eq('doctor_id', doctorId);
        const { count: countWeek } = await weekQuery;

        let monthQuery = supabase.from('prescriptions').select('id', { count: 'exact', head: true }).gte('date', monthStr).eq('clinic_id', clinicId);
        if (doctorId) monthQuery = monthQuery.eq('doctor_id', doctorId);
        const { count: countMonth } = await monthQuery;

        // 2. LIVE Active Queue (Clinic-wide for situational awareness)
        let queueQuery = supabase.from('doctor_queue')
          .select('priority')
          .eq('queue_date', todayStr)
          .eq('clinic_id', clinicId)
          .in('status', ['waiting', 'serving']); // Count both waiting and serving as "Pending" or "Active"
        
        const { data: queueData } = await queueQuery;

        const emergency = queueData?.filter(q => q.priority === 'urgent').length || 0;
        const general = (queueData?.length || 0) - emergency;

        // 3. Avg. Consultation Time (Estimate from gap between creations)
        let timeQuery = supabase.from('prescriptions')
          .select('created_at')
          .eq('date', todayStr)
          .eq('clinic_id', clinicId)
          .order('created_at', { ascending: true });
        
        if (doctorId) timeQuery = timeQuery.eq('doctor_id', doctorId);
        const { data: timeData } = await timeQuery;

        let avgConsultTime = 0;
        if (timeData && timeData.length > 1) {
          let totalGap = 0;
          let gapCount = 0;
          for (let i = 0; i < timeData.length - 1; i++) {
            const t1 = new Date(timeData[i].created_at).getTime();
            const t2 = new Date(timeData[i+1].created_at).getTime();
            const gap = (t2 - t1) / (1000 * 60); // minutes
            if (gap < 60) { // filter out long breaks
              totalGap += gap;
              gapCount++;
            }
          }
          avgConsultTime = gapCount > 0 ? Math.round(totalGap / gapCount) : 0;
        }

        setStats({
          today: countToday || 0,
          week: countWeek || 0,
          month: countMonth || 0,
          waitingTotal: queueData?.length || 0,
          waitingEmergency: emergency,
          waitingGeneral: general,
          avgTime: avgConsultTime
        });

      } catch (err) {
        console.error('Error fetching sidebar analytics:', err);
      } finally {
        setLoading(false);
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId, doctorId]);

  useEffect(() => {
    if (!clinicId) return;

    fetchAnalytics();
    
    // Live realtime subscription — updates sidebar instantly on any queue change
    const channel = supabase
      .channel(`sidebar-analytics-${clinicId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'doctor_queue',
        filter: `clinic_id=eq.${clinicId}`,
      }, () => {
        fetchAnalytics();
      })
      .subscribe();

    // Fallback poll every 60 seconds (realtime is primary)
    const interval = setInterval(() => fetchAnalytics(), 60 * 1000);
    return () => { supabase.removeChannel(channel); clearInterval(interval); };

  }, [clinicId, doctorId, fetchAnalytics]);

  if (loading && !stats.today) return <div className={styles.analyticsSkeleton}>Loading intelligence...</div>;

  return (
    <div className={styles.analyticsSection}>
      <h3 className={styles.analyticsTitle}>Clinical Intelligence</h3>
      
      <div className={styles.statsGrid}>
        
        {/* 1. Active Queue Card (Priority) */}
        <Link href="/portal/doctor-dashboard" className={styles.analyticsCard} style={{ textDecoration: 'none', transition: 'all 0.2s', cursor: 'pointer' }}>
          <div className={styles.cardInfo}>
            <span className={styles.cardLabel}>Active Queue</span>
            <div className={styles.multiStats} style={{ marginTop: '4px' }}>
              <div className={styles.statItem} style={{ borderRight: '1px solid rgba(255,255,255,0.1)', paddingRight: '8px' }}>
                <span className={styles.statVal} style={{ color: '#ef4444' }}>{stats.waitingEmergency}</span>
                <span className={styles.statSub}>Emergency</span>
              </div>
              <div className={styles.statItem} style={{ paddingLeft: '8px' }}>
                <span className={styles.statVal}>{stats.waitingGeneral}</span>
                <span className={styles.statSub}>General</span>
              </div>
            </div>
            <span className={styles.statSub} style={{ marginTop: '4px', opacity: 0.7 }}>{stats.waitingTotal} Pending</span>
          </div>
          <div className={`${styles.cardIcon} ${styles.orangeIcon}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          </div>
        </Link>

        {/* 2. Avg Consult Time Card */}
        <div className={styles.analyticsCard}>
          <div className={styles.cardInfo}>
            <span className={styles.cardLabel}>Avg Consult</span>
            <div className={styles.statValLarge}>{stats.avgTime}m</div>
            <span className={styles.statSub}>Minutes per Patient</span>
          </div>
          <div className={`${styles.cardIcon} ${styles.purpleIcon}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
          </div>
        </div>

        {/* 3. Patient Census Card (Footfall) */}
        <div className={styles.analyticsCard}>
          <div className={styles.cardInfo}>
            <span className={styles.cardLabel}>Patient Census</span>
            <div className={styles.multiStats}>
              <div className={styles.statItem}>
                <span className={styles.statVal}>{stats.today}</span>
                <span className={styles.statSub}>Today</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statVal}>{stats.week}</span>
                <span className={styles.statSub}>Week</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statVal}>{stats.month}</span>
                <span className={styles.statSub}>Month</span>
              </div>
            </div>
          </div>
          <div className={`${styles.cardIcon} ${styles.blueIcon}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          </div>
        </div>

      </div>
    </div>
  );
}
