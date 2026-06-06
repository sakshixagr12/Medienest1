import Link from "next/link";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";
import styles from "../privacy/page.module.css";

export default function TermsOfService() {
  return (
    <div className={styles.page}>
      <PublicNav />

      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Terms of Service</h1>
          <p>Effective Date: April 11, 2026</p>
        </div>

        <div className={styles.content}>
          <h2>1. Agreement to Terms</h2>
          <p>
            By accessing or using the Jirova Care platform, you agree to be bound by these Terms of Service. If you disagree with any part of these terms, you do not have permission to access the Service.
          </p>

          <h2>2. Software Service Only</h2>
          <p style={{ background: "#eff6ff", borderLeft: "4px solid #3b82f6", padding: "12px 16px", borderRadius: "4px", color: "#1e3a8a", fontWeight: 600 }}>
            Jirova Care provides software tools and does not provide medical advice, diagnosis, or treatment.
          </p>

          <h2>3. Healthcare Responsibility</h2>
          <p style={{ background: "#eff6ff", borderLeft: "4px solid #3b82f6", padding: "12px 16px", borderRadius: "4px", color: "#1e3a8a", fontWeight: 600 }}>
            Clinical decisions remain the sole responsibility of licensed healthcare professionals.
          </p>

          <h2>4. AI Disclaimer</h2>
          <p style={{ background: "#fffbeb", borderLeft: "4px solid #d97706", padding: "12px 16px", borderRadius: "4px", color: "#78350f", fontWeight: 600 }}>
            AI generated content (including medical notes summaries and smart suggestions) may contain errors and must be reviewed and verified by qualified professionals before clinical implementation.
          </p>

          <h2>5. User Accounts</h2>
          <p>
            When registering an account, you must provide accurate, complete, and current information. You are solely responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
          </p>

          <h2>6. Subscription &amp; Payments</h2>
          <p>
            Some parts of our platform are billed on a subscription basis. You will be billed in advance on a recurring and periodic basis. Payment obligations are non-cancelable and all fees paid are non-refundable except as specified herein.
          </p>

          <h2>7. Refund Policy</h2>
          <p>
            Subscription fees are non-refundable once processed. If you wish to cancel your plan, you must do so before the next billing cycle. Account cancellations will take effect at the end of the current paid billing period.
          </p>

          <h2>8. Acceptable Use</h2>
          <p>
            You agree to use Jirova Care only for lawful, professional clinical administration purposes. You must not use the service to transmit malicious code, attempt unauthorized database access, or violate patient data privacy rules.
          </p>

          <h2>9. Termination</h2>
          <p>
            We reserve the right to suspend or terminate your account immediately, without prior notice or liability, for any breach of these Terms, including non-payment of subscription fees or violation of acceptable use guidelines.
          </p>

          <h2>10. Limitation of Liability</h2>
          <p style={{ background: "#fef2f2", borderLeft: "4px solid #ef4444", padding: "12px 16px", borderRadius: "4px", color: "#7f1d1d", fontWeight: 600 }}>
            Jirova Care shall not be liable for medical decisions, treatment outcomes, or patient care provided through use of the platform.
          </p>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
