import Link from "next/link";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";
import styles from "../privacy/page.module.css";

export default function PricingPage() {
  return (
    <div className={styles.page}>
      <PublicNav />

      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Pricing Plans</h1>
          <p>Simple, transparent plans designed for practices of all sizes.</p>
        </div>

        <div className={styles.content}>
          <h2>Plan Comparison</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px", margin: "24px 0" }}>
            <div style={{ padding: "20px", border: "1px solid #e2e8f0", borderRadius: "12px", background: "#f8fafc" }}>
              <h3 style={{ margin: "0 0 10px 0", color: "#1e3a8a" }}>Solo Practice</h3>
              <p style={{ fontSize: "24px", fontWeight: "bold", margin: "0 0 16px 0" }}>₹999<span style={{ fontSize: "14px", fontWeight: "normal", color: "#64748b" }}>/mo</span></p>
              <ul style={{ paddingLeft: "20px", fontSize: "14px", color: "#475569" }}>
                <li>1 Doctor Seat</li>
                <li>Digital Prescriptions</li>
                <li>Patient History Log</li>
                <li>WhatsApp PDF Scripts</li>
              </ul>
            </div>

            <div style={{ padding: "20px", border: "2px solid #3b82f6", borderRadius: "12px", background: "#f0f9ff", position: "relative" }}>
              <div style={{ position: "absolute", top: "-12px", right: "12px", background: "#3b82f6", color: "white", fontSize: "10px", fontWeight: "bold", padding: "2px 8px", borderRadius: "10px" }}>POPULAR</div>
              <h3 style={{ margin: "0 0 10px 0", color: "#1e3a8a" }}>Growing Clinic</h3>
              <p style={{ fontSize: "24px", fontWeight: "bold", margin: "0 0 16px 0" }}>₹2,999<span style={{ fontSize: "14px", fontWeight: "normal", color: "#64748b" }}>/mo</span></p>
              <ul style={{ paddingLeft: "20px", fontSize: "14px", color: "#475569" }}>
                <li>Up to 5 Doctor Seats</li>
                <li>Queue Manager</li>
                <li>Billing &amp; Receipts</li>
                <li>AI Prescription Summarizer</li>
              </ul>
            </div>

            <div style={{ padding: "20px", border: "1px solid #e2e8f0", borderRadius: "12px", background: "#f8fafc" }}>
              <h3 style={{ margin: "0 0 10px 0", color: "#1e3a8a" }}>Enterprise</h3>
              <p style={{ fontSize: "24px", fontWeight: "bold", margin: "0 0 16px 0" }}>Custom</p>
              <ul style={{ paddingLeft: "20px", fontSize: "14px", color: "#475569" }}>
                <li>Unlimited Seats</li>
                <li>Multi-Clinic Dashboards</li>
                <li>Dedicated Account Support</li>
                <li>Custom Integrations</li>
              </ul>
            </div>
          </div>

          <h2>Billing Terms</h2>
          <p style={{ fontWeight: "600", color: "#1e3a8a" }}>
            Prices exclude applicable taxes.
          </p>
          <p>
            Subscriptions are billed at the beginning of each cycle (monthly or annually). All prices listed on the site are in Indian Rupees (INR) unless otherwise specified.
          </p>

          <h2>Cancellation Policy</h2>
          <p>
            You can cancel your subscription plan at any time. Once canceled, your access to premium features will continue until the end of the current billing cycle. No further automatic charges will be made.
          </p>

          <h2>Trial Terms</h2>
          <p>
            We offer a 14-day free trial on selected plans (Solo Practice and Growing Clinic) for new practitioners. No credit card is required to begin the trial. At the end of the trial period, you must select a plan and input payment details to continue using Jirova Care.
          </p>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
