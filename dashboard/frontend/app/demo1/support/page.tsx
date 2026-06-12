import Link from "next/link";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";
import styles from "../privacy/page.module.css";

export default function ContactSupport() {
  return (
    <div className={styles.page}>
      <PublicNav />

      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Contact Support</h1>
          <p>We are here to help keep your clinical workflows running smoothly.</p>
        </div>

        <div className={styles.content}>
          <h2>How to Reach Us</h2>
          <p>
            For any queries, technical support, billing inquiries, or feedback, our dedicated support concierge is ready to assist you.
          </p>

          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "24px", borderRadius: "12px", marginBottom: "24px" }}>
            <h3 style={{ margin: "0 0 8px 0", color: "#1e3a8a" }}>Contact Email</h3>
            <p style={{ margin: "0 0 12px 0", fontSize: "14px", color: "#64748b" }}>
              Please drop us an email describing your issue or request.
            </p>
            <a href="mailto:utkarsh.shukla.ind@gmail.com" style={{ fontWeight: "bold", color: "#3b82f6" }}>utkarsh.shukla.ind@gmail.com</a>
          </div>

          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "24px", borderRadius: "12px", marginBottom: "24px" }}>
            <h3 style={{ margin: "0 0 8px 0", color: "#1e3a8a" }}>Response Time</h3>
            <p style={{ margin: 0, fontSize: "14px", color: "#475569" }}>
              Typical response within 24-48 business hours.
            </p>
          </div>

          <h2>Bug Reports</h2>
          <p>
            If you encounter a technical bug or system failure, please email us with details of the issue, screenshots if possible, and your registered clinic name. We will investigate and deploy hotfixes as a high priority.
          </p>

          <h2>Billing Questions</h2>
          <p>
            For any issues related to payment processing, invoice generation, subscription upgrades, or plan cancellations, reach out directly with your billing identifiers to speed up resolutions.
          </p>

          <h2>Feature Requests</h2>
          <p>
            We love building custom workflow enhancements for our practitioners. If you have requests for custom prescription templates, database field customizations, or analytics dashboards, write to us!
          </p>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
