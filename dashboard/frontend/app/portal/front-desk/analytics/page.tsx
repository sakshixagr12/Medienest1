'use client';

import { useState, useEffect, useMemo } from 'react';
import { useClinic } from '@/context/ClinicContext';
import { API_BASE_URL, authenticatedFetch } from '@/lib/api';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import styles from './page.module.css';

interface StatItem {
  diagnosis?: string;
  medicine_name?: string;
  gender?: string;
  category?: string;
  count: number | string;
  percentage?: number;
  trend?: number | null;
  prevCount?: number;
  isOverused?: boolean;
}

interface AnalyticsData {
  summary: {
    totalPatients: number;
    prevTotalPatients: number;
    patientsTrend: number | null;
    revenue: number;
    prevRevenue: number;
    revenueTrend: number | null;
    avgConsultTime: string;
    prevConsultTime: string;
    consultTrend: number | null;
  };
  diagnoses: StatItem[];
  medicines: StatItem[];
  demographics: StatItem[];
  advancedDemographics: any[];
  diseaseTimeline?: any[];
  revenueTimeline?: { date: string, amount: number }[];
}

export default function AnalyticsDashboardPage() {
  const { clinic } = useClinic();
  
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [baseFilter, setBaseFilter] = useState('This Month');
  const [baseCustomStart, setBaseCustomStart] = useState('');
  const [baseCustomEnd, setBaseCustomEnd] = useState('');

  const [isComparisonMode, setIsComparisonMode] = useState(false);
  const [compareFilter, setCompareFilter] = useState('Previous Period');
  const [compareCustomStart, setCompareCustomStart] = useState('');
  const [compareCustomEnd, setCompareCustomEnd] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [activeDiagnosis, setActiveDiagnosis] = useState<string | null>(null);
  const [modalPatients, setModalPatients] = useState<any[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

  const [showAllDiagnoses, setShowAllDiagnoses] = useState(false);
  const [showAllMedicines, setShowAllMedicines] = useState(false);
  const [revenueDrawerOpen, setRevenueDrawerOpen] = useState(false);

  const computedRanges = useMemo(() => {
     let bStart = new Date(); let bEnd = new Date();
     let cStart = new Date(); let cEnd = new Date();
     let validBase = false;

     const now = new Date();

     if (baseFilter === 'Today') {
         bStart.setHours(0,0,0,0);
         bEnd.setHours(23,59,59,999);
         validBase = true;
     } else if (baseFilter === 'Last 7 Days') {
         bStart.setDate(now.getDate() - 7);
         validBase = true;
     } else if (baseFilter === 'This Month') {
         bStart.setDate(1); bStart.setHours(0,0,0,0);
         bEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
         validBase = true;
     } else if (baseFilter === 'Custom...') {
         if (baseCustomStart && baseCustomEnd) {
             bStart = new Date(baseCustomStart);
             bEnd = new Date(baseCustomEnd);
             bEnd.setHours(23,59,59,999);
             validBase = true;
         }
     }

     if (!validBase) return { base: null, compare: null };

     let validCompare = false;
     if (isComparisonMode) {
         if (compareFilter === 'Previous Period') {
             const diffTime = Math.abs(bEnd.getTime() - bStart.getTime());
             const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
             cStart = new Date(bStart);
             cStart.setDate(cStart.getDate() - diffDays);
             cEnd = new Date(bEnd);
             cEnd.setDate(cEnd.getDate() - diffDays);
             validCompare = true;
         } else if (compareFilter === 'Previous Year') {
             cStart = new Date(bStart); cStart.setFullYear(cStart.getFullYear() - 1);
             cEnd = new Date(bEnd); cEnd.setFullYear(cEnd.getFullYear() - 1);
             validCompare = true;
         } else if (compareFilter === 'Custom...') {
             if (compareCustomStart && compareCustomEnd) {
                 cStart = new Date(compareCustomStart);
                 cEnd = new Date(compareCustomEnd);
                 cEnd.setHours(23,59,59,999);
                 validCompare = true;
             }
         }
     }

     return {
         base: { start: bStart.toISOString(), end: bEnd.toISOString() },
         compare: validCompare ? { start: cStart.toISOString(), end: cEnd.toISOString() } : null
     }
  }, [baseFilter, baseCustomStart, baseCustomEnd, isComparisonMode, compareFilter, compareCustomStart, compareCustomEnd]);

    async function fetchAnalytics() {
      if (!clinic) return;
      if (baseFilter === 'Custom...' && (!baseCustomStart || !baseCustomEnd)) return;
      
      setIsLoading(true);
      setError(null);

      try {
        const queryParams = new URLSearchParams({ clinic_id: clinic.id });
        
        if (computedRanges.base) {
           queryParams.append('baseStart', computedRanges.base.start);
           queryParams.append('baseEnd', computedRanges.base.end);
        }
        
        if (isComparisonMode && computedRanges.compare) {
           queryParams.append('performCompare', 'true');
           queryParams.append('compareStart', computedRanges.compare.start);
           queryParams.append('compareEnd', computedRanges.compare.end);
        }

        const response = await authenticatedFetch(`${API_BASE_URL}/api/analytics/dashboard?${queryParams.toString()}`);
        const result = await response.json();

        if (result.success) {
          setData(result.data);
        } else {
          setError(result.error || 'Failed to fetch analytics from API');
        }
      } catch (err: any) {
        console.error("Analytics fetch error:", err);
        setError('Network error. Ensure the MediNest backend is running.');
      } finally {
        setIsLoading(false);
      }
    }

  useEffect(() => {
    fetchAnalytics();
  }, [clinic, computedRanges.base, computedRanges.compare, isComparisonMode]);

  const handleDiagnosisClick = async (diagnosis: string) => {
      setActiveDiagnosis(diagnosis);
      setModalOpen(true);
      setModalLoading(true);
      
      try {
          const queryParams = new URLSearchParams({ clinic_id: clinic?.id || '', diagnosis });
          if (computedRanges.base) {
             queryParams.append('baseStart', computedRanges.base.start);
             queryParams.append('baseEnd', computedRanges.base.end);
          }

          const res = await authenticatedFetch(`${API_BASE_URL}/api/analytics/patients?${queryParams.toString()}`);
          const result = await res.json();
          if (result.success) setModalPatients(result.data);
      } catch(err) {
          console.error('Failed to grab patients', err);
      } finally {
          setModalLoading(false);
      }
  }

  // Soft Global Theme Colors mapped to Dribbble aesthetic
  const GENDER_COLORS: Record<string, string> = {
    'Male': '#818cf8',   // Blue primary
    'Female': '#f472b6', // Pink
    'Other': '#fbbf24',  // Gold/Yellow
    'Unknown': '#e2e8f0' // Grey
  };

  const renderTrend = (trend: number | null) => {
      if (!isComparisonMode || trend === null) return null;
      if (trend > 0) return <span className={`${styles.trendBadge} ${styles.trendUp}`}>🟢 +{trend}%</span>;
      if (trend < 0) return <span className={`${styles.trendBadge} ${styles.trendDown}`}>🔴 {trend}%</span>;
      return <span className={`${styles.trendBadge} ${styles.trendNeutral}`}>⚪ 0%</span>;
  };

  const renderLineChart = () => {
    // 1. Validate data
    const diags = data?.diagnoses || [];
    if (diags.length === 0) return null;
    const top3 = diags.slice(0, 3);
    
    // 2. Prepare timeline points (tData)
    let tData = data?.diseaseTimeline || [];
    // If no timeline from backend, create a dummy one based on base totals to show "something"
    if (tData.length === 0) {
      tData = [
        { date: 'Start', ...(top3.reduce((acc, d) => ({...acc, [d.diagnosis!]: 0}), {})) },
        { date: 'End', ...(top3.reduce((acc, d) => ({...acc, [d.diagnosis!]: Number(d.count)}), {})) }
      ];
    } else if (tData.length === 1) {
      const single = tData[0];
      tData = [
        { ...single, date: 'Start' },
        { ...single, date: 'End' }
      ];
    }

    // 3. Scale logic
    const allVals = tData.flatMap(pt => top3.map(d => Number(pt[d.diagnosis!] || 0)));
    const maxVal = Math.max(1, ...allVals);
    const lineColors = ['#6366f1', '#10b981', '#f43f5e']; // Vibrant Indigo, Teal, Rose

    return (
      <div style={{ 
        marginTop: '2rem', 
        padding: '1.5rem', 
        background: '#fcfdff', 
        borderRadius: '20px', 
        border: '1px solid #e2e8f0',
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h4 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--sanctuary-ink)', textTransform: 'uppercase' }}>Clinical Trends</h4>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, borderRadius: '4px', background: 'var(--sanctuary-gray-low)', padding: '2px 6px' }}>Top 3 Focus</span>
        </div>

        <div style={{ width: '100%', height: '100px', position: 'relative', marginBottom: '1.5rem' }}>
          <svg viewBox="0 0 300 100" width="100%" height="100%" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
            {/* Grid Lines */}
            <line x1="0" y1="0" x2="300" y2="0" stroke="#f1f5f9" strokeWidth="1" />
            <line x1="0" y1="50" x2="300" y2="50" stroke="#f1f5f9" strokeWidth="1" />
            <line x1="0" y1="100" x2="300" y2="100" stroke="#f1f5f9" strokeWidth="1" />

            {top3.map((diag, i) => {
              const name = diag.diagnosis;
              if (!name) return null;
              
              const points = tData.map((pt, idx) => {
                const x = (idx / (tData.length - 1)) * 300;
                const val = Number(pt[name] || 0);
                const y = 100 - ((val / maxVal) * 80); // 80% range
                return `${x},${y}`;
              }).join(' ');

              return (
                <polyline
                  key={name}
                  points={points}
                  fill="none"
                  stroke={lineColors[i]}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              );
            })}
          </svg>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {top3.map((diag, i) => {
             const name = diag.diagnosis;
             const isUp = diag.trend && diag.trend > 0;
             const isDown = diag.trend && diag.trend < 0;
             
             return (
                <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: lineColors[i] }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--sanctuary-ink)' }}>{name}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800 }}>
                    {isUp ? (
                      <span style={{ color: '#16a34a' }}>{name} ↑ this week</span>
                    ) : isDown ? (
                      <span style={{ color: '#dc2626' }}>{name} ↓ this week</span>
                    ) : (
                      <span style={{ color: '#64748b' }}>{name} ⚪ stable</span>
                    )}
                  </div>
                </div>
             );
          })}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (isLoading) return <div className={styles.spinner}></div>;
    if (error) return <div className={styles.error}>{error}</div>;
    if (!data) return <div className={styles.emptyState}>No diagnostic data available.</div>;

    const maxDiagnosis = Math.max(...(data.diagnoses.map(d => Number(d.count)) || [1]));
    const maxMedicine = Math.max(...(data.medicines.map(m => Number(m.count)) || [1]));
    const maxRevenue = Math.max(...(data.revenueTimeline?.map(r => Number(r.amount)) || [1]));
    const totalDemographics = data.demographics.reduce((acc, curr) => acc + Number(curr.count), 0);

    let conicStr = '';
    let currentDeg = 0;
    
    const demoItems = data.demographics.map(d => {
      const p = (Number(d.count) / totalDemographics) * 100;
      const deg = (Number(d.count) / totalDemographics) * 360;
      const cLabel = d.gender || 'Unknown';
      const color = GENDER_COLORS[cLabel] || GENDER_COLORS['Unknown'];
      const slice = `${color} ${currentDeg}deg ${currentDeg + deg}deg`;
      currentDeg += deg;
      return { ...d, color, percentage: p.toFixed(1), slice };
    });
    conicStr = demoItems.map(i => i.slice).join(', ');

    return (
      <div className={styles.mainLayout}>
        
        {/* LEFT COLUMN: 66% width */}
        <div className={styles.leftColumn}>
          {/* Top Metric Grid */}
          <div className={styles.glassCard} style={{ padding: '2rem' }}>
             <h3 className={styles.cardHeaderTitle}>
                Overview
                <span className={styles.cardHeaderBadge}>{baseFilter}</span>
             </h3>
             <div className={styles.metricGrid}>
                {/* Lavender Patient Box */}
                <div className={`${styles.metricBox} ${styles.boxLavender}`}>
                   <div className={styles.metricLabel}>
                      <div className={styles.metricIconWrapper}>👤</div>
                      Patients
                   </div>
                   <div className={styles.metricValue}>{data.summary?.totalPatients || 0}</div>
                   <div className={styles.metricSubtext}>
                      {isComparisonMode && baseFilter !== 'All Time' ? (
                         <span>vs prev: {data.summary?.prevTotalPatients} {renderTrend(data.summary?.patientsTrend)}</span>
                      ) : 'Patient Volume'}
                   </div>
                </div>

                {/* Teal Consult Box */}
                <div className={`${styles.metricBox} ${styles.boxTeal}`}>
                   <div className={styles.metricLabel}>
                      <div className={styles.metricIconWrapper}>⏱️</div>
                      Avg Consult
                   </div>
                   <div className={styles.metricValue}>{data.summary?.avgConsultTime || '--'}</div>
                   <div className={styles.metricSubtext}>
                      {isComparisonMode && baseFilter !== 'All Time' ? (
                         <span>vs prev: {data.summary?.prevConsultTime} {renderTrend(data.summary?.consultTrend)}</span>
                      ) : 'Process Efficiency'}
                   </div>
                </div>

                {/* Gold Revenue Box */}
                <div 
                  className={`${styles.metricBox} ${styles.boxGold}`} 
                  onClick={() => setRevenueDrawerOpen(true)}
                  style={{ cursor: 'pointer' }}
                >
                   <div className={styles.metricLabel}>
                      <div className={styles.metricIconWrapper}>💳</div>
                      Revenue 
                      <span style={{ fontSize: '0.6rem', color: 'var(--sanctuary-primary)', marginLeft: 'auto' }}>View Details ↗</span>
                   </div>
                   <div className={styles.metricValue}>₹{(data.summary?.revenue || 0).toLocaleString()}</div>
                   <div className={styles.metricSubtext}>
                      {isComparisonMode && baseFilter !== 'All Time' ? (
                         <span>vs prev: ₹{data.summary?.prevRevenue?.toLocaleString()} {renderTrend(data.summary?.revenueTrend)}</span>
                      ) : 'Gross Income'}
                   </div>
                </div>
             </div>
          </div>

          <div className={styles.splitRow}>
             {/* Diagnoses Card */}
             <div className={styles.glassCard}>
                <h3 className={styles.cardHeaderTitle}>Diagnoses Treated</h3>
                
                {data.diagnoses.length > 0 ? (
                  <div className={styles.barList}>
                    {(showAllDiagnoses ? data.diagnoses : data.diagnoses.slice(0, 5)).map((item, i) => (
                      <div key={i} className={styles.clickableRow} style={{ animationDelay: `${i * 0.05}s` }} onClick={() => handleDiagnosisClick(item.diagnosis!)}>
                        <div className={styles.barInfo}>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                             <span>{item.diagnosis}</span>
                             {isComparisonMode && renderTrend(item.trend!)}
                          </div>
                          <div className={styles.statValue}>
                             <span className={styles.countLg}>{item.count}</span>
                             <span style={{ fontSize: '0.8rem', color: 'var(--sanctuary-ink-l)' }}>({item.percentage}%)</span>
                          </div>
                        </div>
                        <div className={styles.barTrack}>
                          <div className={styles.barFill} style={{ width: `${(Number(item.count) / maxDiagnosis) * 100}%`, background: '#818cf8' }} />
                        </div>
                      </div>
                    ))}
                    {data.diagnoses.length > 5 && (
                       <button className={styles.showMoreBtn} onClick={() => setShowAllDiagnoses(!showAllDiagnoses)}>
                          {showAllDiagnoses ? 'Show Less ⬆️' : `Show All Diagnoses (${data.diagnoses.length}) ⬇️`}
                       </button>
                    )}
                  </div>
                ) : (
                  <div className={styles.emptyState}>No activity.</div>
                )}

                {/* Line Chart Section */}
                {(data.diagnoses.length > 0) && (
                  <div style={{ 
                    marginTop: '2rem', 
                    padding: '1.5rem', 
                    background: '#f8fafc', 
                    borderRadius: '20px', 
                    border: '1px solid #e2e8f0' 
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                      <h4 style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase' }}>Clinical Trends</h4>
                      <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>Pulse Monitor</span>
                    </div>

                    <div style={{ width: '100%', height: '80px', marginBottom: '1.5rem' }}>
                      <svg viewBox="0 0 300 80" width="100%" height="100%" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                        {/* Horizontal benchmarks */}
                        <line x1="0" y1="0" x2="300" y2="0" stroke="#f1f5f9" strokeWidth="1" />
                        <line x1="0" y1="40" x2="300" y2="40" stroke="#f1f5f9" strokeWidth="1" />
                        <line x1="0" y1="80" x2="300" y2="80" stroke="#f1f5f9" strokeWidth="1" />

                        {(() => {
                           const top3 = data.diagnoses.slice(0, 3);
                           let timeline = data.diseaseTimeline || [];
                           
                           // Fallback data
                           if (timeline.length === 0) {
                              timeline = [
                                { date: 'A', ...(top3.reduce((acc, d) => ({...acc, [d.diagnosis!]: 0}), {})) },
                                { date: 'B', ...(top3.reduce((acc, d) => ({...acc, [d.diagnosis!]: Number(d.count)}), {})) }
                              ];
                           } else if (timeline.length === 1) {
                              timeline = [{ ...timeline[0], date: 'A' }, { ...timeline[0], date: 'B' }];
                           }

                           const colors = ['#6366f1', '#10b981', '#f43f5e'];
                           const allValues = timeline.flatMap(pt => top3.map(d => Number(pt[d.diagnosis!] || 0))).filter(v => !isNaN(v));
                           const maxV = Math.max(1, ...allValues);

                           return top3.map((diag, i) => {
                              const name = diag.diagnosis;
                              if (!name) return null;
                              const points = timeline.map((pt, idx) => {
                                 const x = (idx / (timeline.length - 1)) * 300;
                                 const val = Number(pt[name] || 0);
                                 const y = 80 - ((val / maxV) * 70); 
                                 return `${x},${y}`;
                              }).join(' ');
                              
                              return (
                                <polyline key={name} points={points} fill="none" stroke={colors[i]} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                              );
                           });
                        })()}
                      </svg>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {data.diagnoses.slice(0, 3).map((diag, i) => {
                         const name = diag.diagnosis;
                         const isUp = diag.trend && diag.trend > 0;
                         const isDown = diag.trend && diag.trend < 0;
                         const colors = ['#6366f1', '#10b981', '#f43f5e'];

                         return (
                            <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors[i] }} />
                                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b' }}>{name}</span>
                              </div>
                              <div style={{ fontSize: '0.75rem', fontWeight: 800 }}>
                                {isUp ? (
                                  <span style={{ color: '#16a34a' }}>{name} ↑ increase</span>
                                ) : isDown ? (
                                  <span style={{ color: '#dc2626' }}>{name} ↓ decrease</span>
                                ) : (
                                  <span style={{ color: '#64748b' }}>{name} stable</span>
                                )}
                              </div>
                            </div>
                         );
                      })}
                    </div>
                  </div>
                )}
             </div>

             {/* Medicines Card */}
             <div className={styles.glassCard}>
                <h3 className={styles.cardHeaderTitle}>Top Prescriptions</h3>
                <div style={{ width: '100%' }}>
                  {data.medicines.length > 0 ? (
                    <div className={styles.barList}>
                      {(showAllMedicines ? data.medicines : data.medicines.slice(0, 5)).map((item, i) => (
                        <div key={i} className={styles.clickableRow} style={{ animationDelay: `${i * 0.05}s` }}>
                          <div className={styles.barInfo}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                               <span className={styles.categoryTag}>{item.category}</span>
                               <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '4px' }}>{item.medicine_name}</span>
                               {item.isOverused && <span className={styles.overusedChip}>⚠️ High</span>}
                            </div>
                            <span className={styles.countLg}>{item.count}</span>
                          </div>
                          <div className={styles.barTrack}>
                            <div className={styles.barFill} style={{ width: `${(Number(item.count) / maxMedicine) * 100}%`, background: '#34d399' }} />
                          </div>
                        </div>
                      ))}
                      {data.medicines.length > 5 && (
                         <button className={styles.showMoreBtn} onClick={() => setShowAllMedicines(!showAllMedicines)}>
                            {showAllMedicines ? 'Show Less ⬆️' : `Show All Medicines (${data.medicines.length}) ⬇️`}
                         </button>
                      )}
                    </div>
                  ) : (
                    <div className={styles.emptyState}>No activity.</div>
                  )}
                </div>
             </div>
          </div>
        </div>

        {/* RIGHT COLUMN: 33% width */}
        <div className={styles.rightColumn}>
           
           <div className={styles.glassCard}>
              <h3 className={styles.cardHeaderTitle}>
                 Patient Demographics
                 <span className={styles.cardHeaderBadge}>{baseFilter}</span>
              </h3>
              {demoItems.length > 0 ? (
                <>
                  <div className={styles.pieContainer} style={{ background: `conic-gradient(${conicStr})` }}>
                    <div className={styles.pieTotal}>
                      <div className={styles.pieTotalNum}>{totalDemographics}</div>
                      <div className={styles.pieTotalLbl}>Total</div>
                    </div>
                  </div>
                  <div className={styles.demoLegend}>
                    {demoItems.map((item, i) => (
                      <div key={i} className={styles.legendItem}>
                        <div className={styles.legendColor} style={{ backgroundColor: item.color }} />
                        <div className={styles.legendDetails}>
                          <span className={styles.legendName}>{item.gender || 'Unknown'}</span>
                        </div>
                        <div style={{ marginLeft: 'auto', fontWeight: 800, color: 'var(--sanctuary-ink)', fontSize: '0.95rem' }}>
                          {item.percentage}%
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                 <div className={styles.emptyState}>No data.</div>
              )}
           </div>

           <div className={styles.glassCard}>
              <h3 className={styles.cardHeaderTitle}>Age Matrix Trends</h3>
              {data.advancedDemographics && data.advancedDemographics.length > 0 ? (
                 <div className={styles.recentActivityList}>
                    {data.advancedDemographics.map((ag) => (
                       <div key={ag.ageGroup} className={styles.recentItem}>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                             <div className={styles.recentAvatar}>{ag.ageGroup.split('-')[0] || ag.ageGroup}</div>
                             <div className={styles.recentInfo}>
                                <h4>Group: {ag.ageGroup}</h4>
                                <p>Total Volume: {ag.total} cases</p>
                             </div>
                          </div>
                          <div className={styles.recentDept}>{ag.topDisease}</div>
                       </div>
                    ))}
                 </div>
               ) : (
                  <div className={styles.emptyState}>No trends.</div>
               )}
           </div>

        </div>

      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className={styles.page}>
        <div className={styles.container}>
          
          <div className={styles.filterRow} style={{ flexWrap: 'wrap', gap: '1rem' }}>
             <div className={styles.header} style={{ marginBottom: 0, flex: '1 1 400px' }}>
                <h1>Clinical Intelligence</h1>
                <p>Advanced diagnostic and financial oversight for {clinic?.name}</p>
             </div>
             
             <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <select 
                          className={styles.timeSelect} 
                          value={baseFilter} 
                          onChange={(e) => setBaseFilter(e.target.value)}
                        >
                           <option value="Today">Today</option>
                           <option value="Last 7 Days">Last 7 Days</option>
                           <option value="This Month">This Month</option>
                           <option value="All Time">All Time</option>
                           <option value="Custom...">Custom Dates...</option>
                        </select>

                        <label className={styles.compareToggle}>
                           <input 
                             type="checkbox" 
                             checked={isComparisonMode} 
                             onChange={(e) => setIsComparisonMode(e.target.checked)} 
                             style={{ width: '16px', height: '16px', accentColor: 'var(--sanctuary-primary)' }}
                           />
                           Compare Mode
                        </label>
                    </div>

                    <button 
                      className={styles.refreshBtn} 
                      onClick={fetchAnalytics}
                      disabled={isLoading}
                      title="Refresh Analytics"
                    >
                       <svg 
                        className={isLoading ? styles.spinning : ''} 
                        width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                       >
                         <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                         <polyline points="22 4 22 10 16 10"></polyline>
                       </svg>
                       <span>Refresh</span>
                    </button>
                </div>

                {baseFilter === 'Custom...' && (
                   <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--sanctuary-gray-low)', padding: '6px 12px', borderRadius: '8px' }}>
                       <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>Range:</span>
                       <input type="date" className={styles.timeSelect} style={{ padding: '4px 8px' }} value={baseCustomStart} onChange={e => setBaseCustomStart(e.target.value)} />
                       <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>to</span>
                       <input type="date" className={styles.timeSelect} style={{ padding: '4px 8px' }} value={baseCustomEnd} onChange={e => setBaseCustomEnd(e.target.value)} />
                   </div>
                )}

                {isComparisonMode && (
                   <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '6px 12px', borderRadius: '8px' }}>
                       <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Compare Against:</span>
                       <select 
                          className={styles.timeSelect} style={{ padding: '4px 8px' }}
                          value={compareFilter}
                          onChange={e => setCompareFilter(e.target.value)}
                       >
                          <option value="Previous Period">Previous Period</option>
                          <option value="Previous Year">Previous Year</option>
                          <option value="Custom...">Custom Range...</option>
                       </select>
                       
                       {compareFilter === 'Custom...' && (
                           <>
                             <input type="date" className={styles.timeSelect} style={{ padding: '4px 8px' }} value={compareCustomStart} onChange={e => setCompareCustomStart(e.target.value)} />
                             <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>to</span>
                             <input type="date" className={styles.timeSelect} style={{ padding: '4px 8px' }} value={compareCustomEnd} onChange={e => setCompareCustomEnd(e.target.value)} />
                           </>
                       )}
                   </div>
                )}
             </div>
          </div>
          
          {renderContent()}
          
        </div>
      </div>

      {modalOpen && (
        <div className={styles.modalOverlay} onClick={() => setModalOpen(false)}>
          <div className={styles.modalBox} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Patients with "{activeDiagnosis}"</h2>
              <button className={styles.closeBtn} onClick={() => setModalOpen(false)}>
                 <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            
            <div className={styles.modalBody}>
               {modalLoading ? (
                 <div className={styles.spinner} style={{ margin: '2rem auto' }} />
               ) : modalPatients.length > 0 ? (
                 modalPatients.map(p => (
                   <div key={p.id} className={styles.modalPatientItem}>
                     <div>
                       <div className={styles.patName}>{p.name}</div>
                       <div className={styles.patSub}>{p.age}Y • {p.gender} • {p.phone_number || 'No contact'}</div>
                     </div>
                     <div style={{ textAlign: 'right' }}>
                       <div className={styles.patDate}>
                          {new Date(p.prescription_date).toLocaleDateString()}
                       </div>
                       <Link href={`/portal/doctor-dashboard/patients/${p.id}`} style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--sanctuary-primary)', textDecoration: 'none', display: 'inline-block', marginTop: 4 }}>
                         View Profile 👉
                       </Link>
                     </div>
                   </div>
                 ))
               ) : (
                 <div className={styles.emptyState}>No patients found.</div>
               )}
            </div>
          </div>
        </div>
      )}
      {revenueDrawerOpen && data && (
        <div className={styles.drawerOverlay} onClick={() => setRevenueDrawerOpen(false)}>
           <div className={styles.drawerBox} onClick={e => e.stopPropagation()}>
              <div className={styles.drawerHeader}>
                 <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Revenue Intelligence</h2>
                    <p style={{ fontSize: '0.85rem', color: 'var(--sanctuary-ink-l)', margin: '4px 0 0 0' }}>Detailed financial performance analysis</p>
                 </div>
                 <button className={styles.closeBtn} onClick={() => setRevenueDrawerOpen(false)}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                 </button>
              </div>

              <div className={styles.drawerBody}>
                 <div className={styles.revenueDetailCard}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--sanctuary-ink-l)', textTransform: 'uppercase' }}>Total Revenue ({baseFilter})</div>
                    <div className={styles.revenuePrimaryValue}>₹{data.summary.revenue.toLocaleString()}</div>
                    {isComparisonMode && (
                       <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {renderTrend(data.summary.revenueTrend)}
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--sanctuary-ink-l)' }}>vs Prev. ₹{data.summary.prevRevenue.toLocaleString()}</span>
                       </div>
                    )}
                 </div>

                 {/* Trend Chart (Line) */}
                 <div className={styles.chartContainer}>
                    <div className={styles.chartHeader}>
                       <h4>Revenue Trend</h4>
                       <span className={styles.cardHeaderBadge}>Dynamic Range</span>
                    </div>
                    <div style={{ width: '100%', height: '120px' }}>
                       <svg viewBox="0 0 300 120" width="100%" height="100%" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                          {/* Grid Lines */}
                          <line x1="0" y1="0" x2="300" y2="0" stroke="#f1f5f9" strokeWidth="1" />
                          <line x1="0" y1="60" x2="300" y2="60" stroke="#f1f5f9" strokeWidth="1" />
                          <line x1="0" y1="120" x2="300" y2="120" stroke="#f1f5f9" strokeWidth="1" />

                          {data.revenueTimeline && data.revenueTimeline.length > 0 ? (() => {
                             const maxRev = Math.max(1, ...data.revenueTimeline.map(r => r.amount));
                             const points = data.revenueTimeline.map((pt, idx) => {
                                const x = (idx / (data.revenueTimeline!.length - 1 || 1)) * 300;
                                const y = 120 - ((pt.amount / maxRev) * 100); // 20px padding top
                                return `${x},${y}`;
                             }).join(' ');
                             return (
                                <polyline points={points} fill="none" stroke="var(--sanctuary-primary)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                             );
                          })() : null}
                       </svg>
                    </div>
                 </div>

                 {/* Daily Breakdown (Bar Chart) */}
                 <div className={styles.chartContainer}>
                    <div className={styles.chartHeader}>
                       <h4>Daily Breakdown</h4>
                    </div>
                    <div className={styles.barChart}>
                       {data.revenueTimeline && data.revenueTimeline.length > 0 ? (
                         data.revenueTimeline.slice(-7).map((pt, idx) => {
                            const maxRev = Math.max(1, ...data.revenueTimeline!.map(r => r.amount));
                            const height = (pt.amount / maxRev) * 100;
                            const day = new Date(pt.date).toLocaleDateString('en-US', { weekday: 'short' });
                            return (
                               <div key={idx} className={styles.barItem} style={{ height: `${height}%` }}>
                                  <div className={styles.barLabel}>{day}</div>
                               </div>
                            )
                         })
                       ) : (
                          <div className={styles.emptyState}>Insufficient data for breakdown</div>
                       )}
                    </div>
                 </div>

                 <div style={{ marginTop: '2rem' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '1rem' }}>Financial Summary</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--sanctuary-gray-low)', borderRadius: '12px' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Average Ticket Size</span>
                          <span style={{ fontWeight: 800, color: 'var(--sanctuary-ink)' }}>₹{(data.summary.revenue / (data.summary.totalPatients || 1)).toFixed(0)}</span>
                       </div>
                       <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--sanctuary-gray-low)', borderRadius: '12px' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Busiest Revenue Day</span>
                          <span style={{ fontWeight: 800, color: 'var(--sanctuary-ink)' }}>
                             {data.revenueTimeline?.reduce((max, curr) => curr.amount > max.amount ? curr : max, { date: 'N/A', amount: 0 }).date.split('-').reverse().join('/')}
                          </span>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}
    </DashboardLayout>
  );
}
