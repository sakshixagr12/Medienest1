'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface TopBarProps {
  title: string;
  backHref?: string;
  backLabel?: string;
  showLogout?: boolean;
  showBack?: boolean;
}

export default function TopBar({ title, backHref, backLabel = 'Back', showLogout = true, showBack = true }: TopBarProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    // 1. Client-side sign out (clears local state)
    await supabase.auth.signOut();
    // 2. Server-side sign out (clears cookies and redirects)
    window.location.href = '/auth/logout';
  };

  const handleBack = () => {
    if (backHref) return; // Let Link handle it
    router.back();
  };

  return (
    <header className="ssk-topbar">
      {backHref ? (
        <Link href={backHref} className="topbar-back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span>{backLabel}</span>
        </Link>
      ) : showBack ? (
        <button onClick={handleBack} className="topbar-back" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span>{backLabel}</span>
        </button>
      ) : (
        <div style={{ minWidth: 80 }} />
      )}

      <div className="topbar-logo">
        <div className="topbar-logo-circle">
          <Image src="/assets/medinest_logo.png" alt="MediNest Logo" width={34} height={34} style={{ objectFit: 'contain' }} />
        </div>
        <div className="topbar-title">{title}</div>
      </div>

      <div className="topbar-spacer-right">
        {showLogout && (
          <button className="btn-signout" onClick={handleLogout}>
            Sign Out
          </button>
        )}
      </div>
    </header>
  );
}
