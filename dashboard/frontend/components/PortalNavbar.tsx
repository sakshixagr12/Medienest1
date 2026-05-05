'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useClinic } from '@/context/ClinicContext';
import styles from './PortalNavbar.module.css';

export default function PortalNavbar() {
  const { signOut } = useClinic();

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <div className={styles.brand}>
          <div className={styles.logoWrapper}>
            <Image 
              src="/assets/medinest_logo.png" 
              alt="MediNest Logo" 
              width={32} 
              height={32} 
              className={styles.logo}
            />
          </div>
          <span className={styles.brandName}>MediNest</span>
        </div>

        <div className={styles.actions}>
          <button 
            className={styles.signOutBtn}
            onClick={signOut}
            aria-label="Sign Out"
          >
            <span>Sign Out</span>
            <svg 
              width="18" 
              height="18" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
}
