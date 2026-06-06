import Link from "next/link";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";
import styles from "../privacy/page.module.css";

export default function FeaturesPage() {
  return (
    <div className={styles.page}>
      <PublicNav />

      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Features Overview</h1>
          <p>Explore what Jirova Care does to streamline your clinical operations.</p>
        </div>

        <div className={styles.content}>
          <h2>What Jirova Care Does</h2>
          <p>
            Jirova Care is a comprehensive administrative and documentation suite engineered specifically for outpatient clinics.
          </p>

          <ul>
            <li>
              <strong>Patient Management:</strong> Helps streamline clinical workflows by keeping patient profiles organized, tracking contact logs, and simplifying queue systems.
            </li>
            <li>
              <strong>Prescriptions:</strong> Fast digital script generation, structured dose logging, and records of active medications.
            </li>
            <li>
              <strong>Billing &amp; Invoices:</strong> Automated receipt generation, professional templates, and simple transaction logs.
            </li>
            <li>
              <strong>Clinical Records:</strong> Access encrypted patient consultation history, past diagnoses, and treatment summaries.
            </li>
            <li>
              <strong>Communication:</strong> Automatic WhatsApp trigger links to deliver digital prescription sheets to patients.
            </li>
            <li>
              <strong>Analytics:</strong> Simple metrics on clinic performance, daily patient counts, and revenue totals.
            </li>
          </ul>

          <h2>Designed for Workflows</h2>
          <p>
            Rather than trying to direct or override medical procedures, Jirova Care serves strictly as an operational companion. Our systems are built to eliminate paperwork bottlenecks, secure administrative access, and help clinicians run their clinics efficiently.
          </p>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
