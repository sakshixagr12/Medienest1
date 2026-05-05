'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import styles from './page.module.css';

export default function PendingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [clinicName, setClinicName] = useState('Loading...');
  const [clinicEmail, setClinicEmail] = useState('');
  const [checking, setChecking] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'approved' | 'pending'; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/auth'); return; }
      const { data: clinic } = await supabase.from('clinics').select('*').eq('owner_user_id', user.id).single();
      if (!clinic) { router.replace('/onboarding'); return; }
      if (clinic.status === 'active') { router.replace('/portal'); return; }
      setClinicName(clinic.name);
      setClinicEmail(clinic.email);
    })();
  }, []);

  const checkStatus = async () => {
    setChecking(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: clinic } = await supabase.from('clinics').select('status').eq('owner_user_id', user!.id).single();
    if (clinic?.status === 'active') {
      setStatusMsg({ type: 'approved', text: '✅ Approved! Redirecting…' });
      setTimeout(() => router.replace('/portal'), 1500);
    } else {
      setStatusMsg({ type: 'pending', text: '⏳ Still under review. Check back later.' });
    }
    setChecking(false);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace('/auth');
  };

  return (
    <div className={styles.bg}>
      <div className={styles.card}>
        <div className={styles.icon}>⏳</div>
        <h2>Awaiting Approval</h2>
        <p className={styles.sub}>Your clinic registration has been received. Our team is reviewing it and will approve your account shortly.</p>
        <div className={styles.badge}>🔔 Status: Under Review</div>
        <hr className={styles.divider} />
        <div className={styles.clinicName}>{clinicName}</div>
        <div className={styles.clinicEmail}>{clinicEmail}</div>
        <div className={styles.actions}>
          <button className={`${styles.btn} ${styles.btnCheck}`} onClick={checkStatus} disabled={checking}>
            {checking ? '🔄 Checking…' : '🔄 Check Approval Status'}
          </button>
          {statusMsg && (
            <div className={`${styles.statusMsg} ${statusMsg.type === 'approved' ? styles.statusApproved : styles.statusPending}`}>
              {statusMsg.text}
            </div>
          )}
          <button className={`${styles.btn} ${styles.btnOut}`} onClick={logout}>Sign Out</button>
        </div>
      </div>
    </div>
  );
}
