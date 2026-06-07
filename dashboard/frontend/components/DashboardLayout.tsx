"use client";

import { useState } from "react";
import DashboardSidebar from "./DashboardSidebar";
import DashboardTopBar from "./DashboardTopBar";
import MobileBottomNav from "./MobileBottomNav";
import styles from "./DashboardLayout.module.css";

interface DashboardLayoutProps {
  children: React.ReactNode;
  hideSidebar?: boolean;
}

export default function DashboardLayout({ children, hideSidebar = false }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={styles.layout}>
      {!hideSidebar && (
        <DashboardSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      )}
      <div className={`${styles.contentArea} ${hideSidebar ? styles.noSidebar : ""}`}>
        <DashboardTopBar
          onMenuOpen={hideSidebar ? undefined : () => setSidebarOpen(true)}
          showBackToPortal={hideSidebar}
        />
        <main className={styles.canvas}>{children}</main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
