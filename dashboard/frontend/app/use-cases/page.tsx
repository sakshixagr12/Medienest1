import Link from "next/link";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";
import styles from "../privacy/page.module.css";

export default function UseCasesPage() {
  return (
    <div className={styles.page}>
      <PublicNav />

      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Use Cases</h1>
          <p>Discover how Jirova Care supports different practice structures.</p>
        </div>

        <div className={styles.content}>
          <h2>Solo Practices</h2>
          <p>
            For individual practitioners running their own clinics, Jirova Care is a clean, single-point tool. Writing prescriptions, managing billing receipts, and checking patient records is entirely streamlined, replacing slow manual logbooks with secure, fast search logs.
          </p>
          <ul>
            <li><strong>Workflow Benefit:</strong> Drastically reduces clinical documentation time between patient visits.</li>
          </ul>

          <h2>Clinics</h2>
          <p>
            For clinics with dedicated front-desk staff, Jirova Care links front-desk registration directly to the doctor's screen. Patients are registered, added to the active consultation queue, seen by the doctor, and billed in a smooth, paperless workflow.
          </p>
          <ul>
            <li><strong>Workflow Benefit:</strong> Eliminates waiting room confusion and keeps patient queues transparent and organized.</li>
          </ul>

          <h2>Multi-Doctor Teams</h2>
          <p>
            For multi-specialty clinics or collaborative teams, Jirova Care allows centralized management. Multiple doctors can access profiles (subject to strict security authorization), coordinate prescriptions, and view unified clinic billing analytics.
          </p>
          <ul>
            <li><strong>Workflow Benefit:</strong> Centralizes clinic logs and coordinates doctor schedules, reducing duplicate entries and admin friction.</li>
          </ul>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
