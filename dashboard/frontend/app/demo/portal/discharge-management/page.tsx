"use client";

import React from "react";
import styles from "./page.module.css";

export default function DischargeManagementPage() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.title}>Discharge Management</h1>
          <p className={styles.subtitle}>
            Manage pending and completed patient discharges.
          </p>
        </div>

        <div className={styles.searchSection}>
          <div className={styles.searchBar}>
            <svg
              className={styles.searchIcon}
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search by Patient Name, Patient ID or Admission ID"
            />
          </div>
        </div>

        <div className={styles.contentGrid}>
          {/* Pending Discharges Card */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Pending Discharges</h2>
            </div>
            <div className={styles.emptyState}>
              <p className={styles.emptyText}>No pending discharges.</p>
            </div>
          </div>

          {/* Recently Discharged Card */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Recently Discharged</h2>
            </div>
            <div className={styles.emptyState}>
              <p className={styles.emptyText}>No discharge records found.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
