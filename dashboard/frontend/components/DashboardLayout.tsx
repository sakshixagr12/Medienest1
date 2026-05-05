'use client';

import { useState } from 'react';
import DashboardSidebar from './DashboardSidebar';
import DashboardTopBar from './DashboardTopBar';
import MobileBottomNav from './MobileBottomNav';
import styles from './DashboardLayout.module.css';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={styles.layout}>
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className={styles.contentArea}>
        <DashboardTopBar onMenuOpen={() => setSidebarOpen(true)} />
        <main className={styles.canvas}>
          {children}
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
