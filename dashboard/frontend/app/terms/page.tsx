import Link from 'next/link';
import Image from 'next/image';
import styles from '../privacy/page.module.css';

export default function TermsOfService() {
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
          <h1>Terms of Service</h1>
          <p>Effective Date: April 11, 2026</p>
        </div>

        <div className={styles.content}>
          <h2>1. Agreement to Terms</h2>
          <p>
            By accessing or using the MediNest platform, you agree to be bound by these Terms of Service. 
            If you disagree with any part of the terms, you do not have permission to access the Service.
          </p>

          <h2>2. License and Access</h2>
          <p>
            Subject to your compliance with these Terms, MediNest grants you a limited, non-exclusive, 
            non-transferable, non-sublicensable license to access and make personal, professional, and 
            commercial use of the MediNest application for your medical clinic.
          </p>

          <h2>3. Clinical Disclaimer</h2>
          <p>
            MediNest is an AI-assisted documentation and administrative tool built to aid healthcare practitioners. 
            The AI-generated insights, summaries, and treatment paths are strictly supplementary and <strong>do not 
            substitute professional medical judgment</strong>. You are solely responsible for reviewing and verifying 
            all clinical outputs before providing care or transmitting prescriptions.
          </p>

          <h2>4. User Accounts</h2>
          <p>
            When you create an account with us, you must provide information that is accurate, complete, 
            and current at all times. Failure to do so constitutes a breach of the Terms, which may result 
            in immediate termination of your account on our Service.
          </p>

          <h2>5. Subscription and Billing</h2>
          <p>
            Some parts of the Service are billed on a subscription basis. You will be billed in advance on a 
            recurring and periodic basis (such as monthly or annually).
          </p>

          <h2>6. Changes to Terms</h2>
          <p>
            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. 
            By continuing to access or use our Service after those revisions become effective, you agree 
            to be bound by the revised terms.
          </p>
        </div>
      </div>
    </div>
  );
}
