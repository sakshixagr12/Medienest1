import Link from 'next/link';
import Image from 'next/image';
import styles from './page.module.css';

export default function PrivacyPolicy() {
  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <Link href="/" className={styles.navLogo}>
           <Image src="/assets/medinest_logo.png" alt="MediNest" width={32} height={32} />
           <span>MediNest</span>
        </Link>
        <Link href="/" className={styles.btnSolidNav}>Back to Home</Link>
      </nav>

      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Privacy Policy</h1>
          <p>Effective Date: April 11, 2026</p>
        </div>

        <div className={styles.content}>
          <h2>1. Introduction</h2>
          <p>
            Welcome to MediNest ("we," "our," or "us"). We are committed to protecting your privacy 
            and ensuring that your personal and clinical data is handled securely and responsibly. 
            This Privacy Policy explains how we collect, use, and protect information when you use 
            our intelligent healthcare platform and services.
          </p>

          <h2>2. Data We Collect</h2>
          <p>We may collect the following types of information:</p>
          <ul>
            <li><strong>Account Information:</strong> Clinic details, practitioner names, contact numbers, and email addresses.</li>
            <li><strong>Clinical Data:</strong> Patient demographics, medical history, prescriptions, and visit summaries securely inputted by practitioners.</li>
            <li><strong>Usage Data:</strong> Information on how you interact with our platform to help us improve the system.</li>
          </ul>

          <h2>3. How We Use Your Data</h2>
          <p>We strictly use the collected data for the following purposes:</p>
          <ul>
            <li>To provide and maintain the MediNest platform functionality.</li>
            <li>To accurately generate and deliver AI-assisted clinical summaries and prescriptions.</li>
            <li>To send automated WhatsApp follow-ups and notifications on your behalf.</li>
            <li>To comply with legal obligations and healthcare data regulations in India.</li>
          </ul>

          <h2>4. Data Storage and Security (HIPAA Compliance)</h2>
          <p>
            Your data is stored on secure, encrypted servers. We implement industry-leading security 
            measures, including full end-to-end encryption, to protect patient health information from 
            unauthorized access, alteration, or disclosure. We do not sell your personal or patient data 
            to third-party marketers.
          </p>

          <h2>5. Third-Party Services</h2>
          <p>
            We may utilize trusted third-party providers (such as secure WhatsApp messaging APIs and AI processing engines like NVIDIA Llama) 
            solely to facilitate our services. These providers are bound by strict confidentiality agreements 
            and data protection standards.
          </p>

          <h2>6. Contact Us</h2>
          <p>
            If you have any questions or concerns regarding this Privacy Policy or your data, please 
            contact our support concierge team at:
          </p>
          <p><strong>Email:</strong> support@medinest.com</p>
        </div>
      </div>
    </div>
  );
}
