"use client";

import { useState, Suspense } from "react";
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
        <Suspense fallback={null}>
          <DashboardSidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
        </Suspense>
      )}
      <div className={`${styles.contentArea} ${hideSidebar ? styles.noSidebar : ""}`}>
        <Suspense fallback={<div style={{ height: "70px", background: "#f8fafc" }} />}>
          <DashboardTopBar
            onMenuOpen={hideSidebar ? undefined : () => setSidebarOpen(true)}
            showBackToPortal={hideSidebar}
          />
        </Suspense>
        <main className={styles.canvas}>{children}</main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
