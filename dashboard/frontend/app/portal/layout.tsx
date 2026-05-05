'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useClinic } from '@/context/ClinicContext';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { clinic, user, loading } = useClinic();
  const router = useRouter();

  // This layout is now protected by middleware and server-side checks.
  // We keep the useEffect empty or remove it if not needed for other things.
  useEffect(() => {}, []);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ border: '3px solid #e2e8f0', borderTopColor: 'var(--teal)', width: 40, height: 40 }} />
          <p style={{ marginTop: 16, color: 'var(--ink-l)', fontSize: 14 }}>Loading your clinic…</p>
        </div>
      </div>
    );
  }

  if (!clinic || clinic.status !== 'active') return null;

  return <>{children}</>;
}
