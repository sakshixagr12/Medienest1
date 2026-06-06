import Link from "next/link";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";
import styles from "../privacy/page.module.css";

export default function HowItWorksPage() {
  return (
    <div className={styles.page}>
      <PublicNav />

      <div className={styles.container}>
        <div className={styles.header}>
          <h1>How It Works</h1>
          <p>Get a quick overview of the end-to-end clinical consultation workflow.</p>
        </div>

        <div className={styles.content}>
          <h2>The Consultation Flow</h2>
          <p>
            Jirova Care is built around a standard clinic's consultation steps, making transitions from registration to invoicing quick and intuitive.
          </p>

          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "32px", borderRadius: "16px", margin: "24px 0" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                <span style={{ background: "#3b82f6", color: "white", width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>1</span>
                <div>
                  <h3 style={{ margin: 0, color: "#1e3a8a" }}>Register Patient</h3>
                  <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#64748b" }}>Enter basic demographics and add the patient to the queue.</p>
                </div>
              </div>
              <div style={{ borderLeft: "2px dashed #cbd5e1", height: "20px", marginLeft: "15px" }}></div>

              <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                <span style={{ background: "#3b82f6", color: "white", width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>2</span>
                <div>
                  <h3 style={{ margin: 0, color: "#1e3a8a" }}>Consult</h3>
                  <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#64748b" }}>Doctor reviews patient history and enters active consultation details.</p>
                </div>
              </div>
              <div style={{ borderLeft: "2px dashed #cbd5e1", height: "20px", marginLeft: "15px" }}></div>

              <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                <span style={{ background: "#3b82f6", color: "white", width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>3</span>
                <div>
                  <h3 style={{ margin: 0, color: "#1e3a8a" }}>Generate Prescription</h3>
                  <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#64748b" }}>Select medications and dosages, then generate a digital prescription sheet.</p>
                </div>
              </div>
              <div style={{ borderLeft: "2px dashed #cbd5e1", height: "20px", marginLeft: "15px" }}></div>

              <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                <span style={{ background: "#3b82f6", color: "white", width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>4</span>
                <div>
                  <h3 style={{ margin: 0, color: "#1e3a8a" }}>Billing</h3>
                  <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#64748b" }}>Generate invoicing receipts for consultation fees and medications.</p>
                </div>
              </div>
              <div style={{ borderLeft: "2px dashed #cbd5e1", height: "20px", marginLeft: "15px" }}></div>

              <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                <span style={{ background: "#3b82f6", color: "white", width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>5</span>
                <div>
                  <h3 style={{ margin: 0, color: "#1e3a8a" }}>Follow-up</h3>
                  <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#64748b" }}>Configure follow-up dates and easily coordinate return visits.</p>
                </div>
              </div>
            </div>
          </div>

          <h2>Simple Setup</h2>
          <p>
            You can begin using Jirova Care immediately. There is no software installation required. Just sign up, customize your clinic details, and start registering your patients.
          </p>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
