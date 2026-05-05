'use client';

import Link from 'next/link';
import Image from 'next/image';
import styles from '../privacy/page.module.css';

export default function ContactSupport() {
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
          <h1>Contact Support</h1>
          <p>We're here to help keep your sanctuary running smoothly.</p>
        </div>

        <div className={styles.content}>
          <h2>How can we help?</h2>
          <p>
            Whether you need help configuring your clinic, importing prior patient data, or resolving technical issues, 
            our dedicated onboarding and support concierge team is ready to assist you.
          </p>

          <div style={{ marginTop: '40px', background: '#f4f3ed', padding: '32px', borderRadius: '16px' }}>
            <h3 style={{ margin: '0 0 16px', color: '#1e1b4b', fontSize: '18px' }}>Email Support</h3>
            <p style={{ margin: '0 0 16px', color: '#4b5563', fontSize: '15px' }}>
              For standard inquiries, technical bug reports, or feature requests, reach out to our team via email. We typically respond within 2-4 hours during business days.
            </p>
            <a 
              href="mailto:support@medinest.com" 
              style={{ display: 'inline-block', background: '#1e1b4b', color: 'white', padding: '12px 24px', borderRadius: '30px', textDecoration: 'none', fontWeight: 'bold' }}
            >
              Email support@medinest.com
            </a>
          </div>

          <div style={{ marginTop: '24px', background: '#f4f3ed', padding: '32px', borderRadius: '16px' }}>
            <h3 style={{ margin: '0 0 16px', color: '#1e1b4b', fontSize: '18px' }}>Emergency Escalation</h3>
            <p style={{ margin: '0 0 4px', color: '#4b5563', fontSize: '15px' }}>
              If you are facing an urgent critical failure preventing patient consultations, please call our emergency hotline:
            </p>
            <p style={{ margin: '0 0 16px', color: '#1e1b4b', fontSize: '16px', fontWeight: 'bold' }}>+91 7380520XXX</p>
          </div>

        </div>
      </div>
    </div>
  );
}
