'use client';

import { useState, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useClinic } from '@/context/ClinicContext';
import styles from './DashboardSidebar.module.css';
import SidebarAnalytics from './SidebarAnalytics';

const navItems = [
  {
    label: 'Dashboard',
    href: '/portal/doctor-dashboard',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
  },
];

interface DashboardSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function DashboardSidebar({ isOpen, onClose }: DashboardSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { doctors, clinic } = useClinic();
  const supabase = createClient();

  const isReceptionist = pathname ? (
    pathname.includes('/portal/front-desk') ||
    pathname.includes('/portal/billing-receipts') ||
    pathname.includes('/portal/day-summary') ||
    pathname.includes('/portal/record-search')
  ) : false;

  const isDoctor = pathname ? (
    pathname.includes('/portal/doctor-dashboard') ||
    pathname.includes('/portal/digital-prescription') ||
    pathname.includes('/portal/discharge-summary')
  ) : false;


  const doctorIdParam = searchParams?.get('doctorId');
  const activeDoctor = doctorIdParam && doctors ? doctors.find(d => d.id === doctorIdParam) : doctors?.[0];
  const activeDoctorName = activeDoctor?.name || 'Doctor';
  const activeDoctorId = activeDoctor?.id || '';

  const buildDoctorUrl = (baseHref: string) => {
    if (!activeDoctorId) return baseHref;
    const url = new URL(baseHref, 'http://localhost'); // dummy base
    url.searchParams.set('doctorId', activeDoctorId);
    url.searchParams.set('doctorName', activeDoctorName);
    return `${url.pathname}${url.search}`;
  };


  const quickActions = [
    { label: 'Add a New Patient', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>, href: '/portal/front-desk/register-patient' },
    { label: 'Live Queue', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>, href: buildDoctorUrl('/portal/doctor-dashboard/queue') },
    { label: 'Patient Hub', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>, href: buildDoctorUrl('/portal/doctor-dashboard/patients') },
    { label: 'Digital Prescription', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>, href: buildDoctorUrl('/portal/digital-prescription') },
    ...(!isReceptionist ? [
      { label: 'Admission Record', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 14h18M5 14v4M19 14v4M3 8h18M6 8V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3M12 4v4"></path></svg>, href: buildDoctorUrl('/portal/admission-record') },
      { label: 'Discharge Summary', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>, href: buildDoctorUrl('/portal/discharge-summary') }
    ] : []),
  ];

  const frontDeskActions = [
    { label: 'Patient Lobby', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>, href: '/portal/front-desk/patients' },
    { label: 'Queue Manager', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>, href: '/portal/front-desk/queue-manager' },
    { label: 'Billing & Invoices', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>, href: '/portal/billing-receipts' },
    { label: 'Day Summary', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>, href: '/portal/day-summary' },
    { label: 'Analytics', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>, href: '/portal/front-desk/analytics' },
  ];


  const handleNavClick = () => {
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isOpen && <div className={styles.backdrop} onClick={onClose} />}

      <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.brand}>
          <div className={styles.logoContainer}>
            <img src="/assets/medinest_logo.png" alt="MediNest Logo" className={styles.brandLogo} />
          </div>
          <div className={styles.brandInfo}>
            <h1>MediNest</h1>
            {!isReceptionist && <p>Doctors Desk</p>}
          </div>
          {/* Mobile close button */}
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <nav className={styles.nav}>
          {/* --- Doctor's Desk Section --- */}
          <div className={styles.clinicalDesk} style={{ borderTop: isReceptionist ? 'none' : '1px solid rgba(23, 3, 55, 0.05)', marginTop: isReceptionist ? 0 : '12px' }}>
            {!isReceptionist && (
              <div className={styles.deskHeader}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" /><path d="M8 7h6" /><path d="M8 11h8" /><path d="M8 15h6" /></svg>
                <span>Doctors Desk</span>
              </div>
            )}

            {/* Dashboard Link directly under header */}
            {navItems.map((item) => {
              let dynamicHref = isReceptionist && item.label === 'Dashboard' 
                ? '/portal/front-desk' 
                : item.href;

              if (!isReceptionist && item.label === 'Dashboard') {
                dynamicHref = buildDoctorUrl(item.href);
              }

              const isActive = isReceptionist ? pathname === '/portal/front-desk' : pathname === item.href;
              return (
                <Link 
                  key={item.label} 
                  href={dynamicHref}
                  onClick={handleNavClick}
                  className={`${styles.navLink} ${isActive ? styles.activeLink : ''}`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {/* --- Unified Front Office Actions --- */}
            {isReceptionist && frontDeskActions.map((action) => (
              <Link key={action.label} href={action.href} onClick={handleNavClick} className={styles.deskAction}>
                {action.icon}
                <span>{action.label}</span>
              </Link>
            ))}

            {!isReceptionist && (
              <div className={styles.deskActions}>
                {quickActions.map((action) => (
                  <Link key={action.label} href={action.href} onClick={handleNavClick} className={styles.deskAction}>
                    {action.icon}
                    <span>{action.label}</span>
                  </Link>
                ))}
              </div>
            )}

            {!isReceptionist && (
              <SidebarAnalytics 
                doctorId={doctors && doctors.length > 0 ? doctors[0].id : null}
                doctorName={activeDoctorName}
                clinicId={clinic?.id || null}
              />
            )}

            <Link href="/portal" onClick={handleNavClick} className={styles.portalButton}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
              <span>Back to Portal</span>
            </Link>
          </div>

        </nav>

        <div className={styles.sidebarFooter}>
          {!isReceptionist && (
            <Link href={buildDoctorUrl('/portal/doctor-dashboard/profile')} onClick={handleNavClick} className={styles.footerLink}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg> Settings
            </Link>
          )}
          <Link href="/support" className={styles.footerLink}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> Help
          </Link>
        </div>
      </aside>
    </>
  );
}
