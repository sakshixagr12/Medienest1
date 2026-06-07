import Link from "next/link";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";
import styles from "./page.module.css";

export default function PrivacyPolicy() {
  return (
    <div className={styles.page}>
      <PublicNav />

      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Privacy Policy</h1>
          <p>Effective Date: April 11, 2026</p>
        </div>

        <div className={styles.content}>
          <h2>1. Information We Collect</h2>
          <p>We collect and store information to provide and improve our services, including:</p>
          <ul>
            <li><strong>User Profile:</strong> Name, email address, phone number, and professional credentials.</li>
            <li><strong>Clinic Information:</strong> Clinic name, address, tagline, contact info, and tax registration identifiers.</li>
            <li><strong>Patient Data Stored by Customers:</strong> Demographic logs, medical histories, prescription lists, queue entries, and billing receipts uploaded by healthcare practitioners using our platform.</li>
          </ul>

          <h2>2. How We Use Information</h2>
          <p>All data is processed strictly for essential service operations, including:</p>
          <ul>
            <li><strong>Authentication:</strong> Securely logging practitioners in and verifying account ownership.</li>
            <li><strong>Service Delivery:</strong> Enabling patient logs, digital prescription script creation, and billing management.</li>
            <li><strong>Analytics:</strong> Tracking internal clinic operations metrics and generating performance summaries.</li>
            <li><strong>Support:</strong> Assisting practitioners and resolving technical issues.</li>
          </ul>

          <h2>3. Third Party Services</h2>
          <p>We may utilize secure third-party platforms to execute specific components of the service:</p>
          <ul>
            <li><strong>Supabase:</strong> For identity authentication, user session state, and database storage.</li>
            <li><strong>Railway:</strong> For secure API server hosting and backend execution.</li>
            <li><strong>Vercel:</strong> For static frontend hosting and deployment.</li>
            <li><strong>WhatsApp Business API:</strong> For automated delivery of digital prescription PDFs to patients.</li>
            <li><strong>Google Login:</strong> For fast Google One Tap practitioner sign-in.</li>
          </ul>

          <h2>4. Cookies</h2>
          <p>
            We use essential cookies and browser local storage to maintain session states, persist security tokens, and remember user dashboard preferences. You can disable cookies in your browser settings, but doing so will prevent you from accessing the secure portal.
          </p>

          <h2>5. Data Retention</h2>
          <p>
            We retain your clinic profiles, patient logs, and billing details for as long as your Jivora Care account remains active, or as required by applicable medical record-keeping laws and guidelines in India.
          </p>

          <h2>6. User Rights</h2>
          <p>
            Practitioners have the right to access, rectify, update, or completely delete their account profile data and patient logs from our active databases by contacting our support concierge team.
          </p>

          <h2>7. Healthcare Clause</h2>
          <p style={{ background: "#f0fdf4", borderLeft: "4px solid #14b8a6", padding: "12px 16px", borderRadius: "4px", color: "#0f766e", fontWeight: 600 }}>
            Healthcare providers are responsible for obtaining any required patient consent before entering and storing patient health data or sending documents via third-party communication channels (such as WhatsApp) through our platform.
          </p>

          <h2>8. Contact Information</h2>
          <p>
            For any queries or requests concerning your data privacy, please contact us at:
          </p>
          <p>
            <strong>Email:</strong> utkarsh.shukla.ind@gmail.com
          </p>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
