'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useSearchParams } from 'next/navigation';
import { useClinic } from '@/context/ClinicContext';
import styles from './page.module.css';

type Tab = 'login' | 'register';

function AuthPageContent() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams?.get('tab') as Tab) ?? 'login';
  const [tab, setTab] = useState<Tab>(initialTab);
  const router = useRouter();
  const supabase = createClient();
  const { user, clinic, loading: checkingAuth } = useClinic();

  // ── GOOGLE LOGIN ──
  const handleGoogleLogin = async () => {
    try {
      console.log('🌐 Auth: Initiating Google OAuth...');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      console.error('❌ Auth: Google error:', err);
      setLoginError(err.message || 'Google login failed.');
    }
  };

  // ── LOGIN STATE ──
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // ── REGISTER STATE ──
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regError, setRegError] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);

  // ── LOGIN ──
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!loginEmail || !loginPass) { setLoginError('Please enter email and password.'); return; }
    
    setLoginLoading(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({ 
        email: loginEmail, 
        password: loginPass 
      });
 
      if (authError) throw authError;
      if (!user) throw new Error('Login successful but no user record found.');

      router.replace('/portal');
    } catch (err: any) {
      setLoginError(err.message || 'Login failed. Please try again.');
      setLoginLoading(false);
    }
  };

  // ── REGISTER ──
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    if (!regEmail) { setRegError('Please enter your email address.'); return; }
    if (regPass.length < 8) { setRegError('Password must be at least 8 characters.'); return; }
    if (regPass !== regConfirm) { setRegError('Passwords do not match.'); return; }
    setRegLoading(true);
    try {
      const { error } = await supabase.auth.signUp({ email: regEmail, password: regPass });
      if (error) throw error;
      setRegSuccess(true);
      setTimeout(() => router.replace('/onboarding'), 1800);
    } catch (err: any) {
      setRegError(err.message || 'Registration failed. Please try again.');
      setRegLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className={styles.page}>
         <div className="spinner" style={{ width: '40px', height: '40px', borderTopColor: 'var(--sanctuary-primary)' }} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={`${styles.bgDecoration} ${styles.decorTop}`} />
      <div className={`${styles.bgDecoration} ${styles.decorBottom}`} />

      <Link href="/" className={styles.backHome}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="m15 18-6-6 6-6"/>
        </svg>
        Home
      </Link>

      <div className={styles.authContainer}>
        <header className={styles.brandHeader}>
          <div className={styles.logoCircle}>
            <Image src="/assets/medinest_logo.png" alt="MediNest" width={44} height={44} style={{ objectFit: 'contain' }} />
          </div>
          <h1>MediNest</h1>
          <p>Advanced Clinic Management Platform.</p>
        </header>

        <main className={`${styles.authCard} ${tab === 'register' ? styles.activeRegister : ''}`}>
          {/* ── FORMS LAYER ── */}
          <div className={styles.formsContainer}>
            {/* Login Form */}
            <div className={`${styles.formWrapper} ${styles.loginWrapper}`}>
              <div className={styles.panelContent}>
                <h2>Welcome back</h2>
                <p className={styles.panelSub}>Sign in to your practitioner portal.</p>
                <form className={styles.formSection} onSubmit={handleLogin}>
                  {loginError && <div className={styles.errorBox}>{loginError}</div>}
                  <button type="button" onClick={handleGoogleLogin} className={styles.googleBtn}>
                    <svg width="20" height="20" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Continue with Google
                  </button>
                  <div className={styles.divider}><span>OR EMAIL</span></div>
                  <div className={styles.fieldGroup}>
                    <div className={styles.field}>
                      <label>Email Address</label>
                      <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="dr.smith@medinest.com" />
                    </div>
                    <div className={styles.field}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <label>Password</label>
                        <Link href="#" style={{ fontSize: 11, fontWeight: 700, color: 'var(--sanctuary-primary)', textDecoration: 'none' }}>Forgot?</Link>
                      </div>
                      <input type="password" value={loginPass} onChange={e => setLoginPass(e.target.value)} placeholder="••••••••" />
                    </div>
                  </div>
                  <button type="submit" className={styles.submitBtn} disabled={loginLoading}>
                    {loginLoading ? <span className="spinner" /> : 'Sign in to MediNest'}
                  </button>
                  <div className={styles.mobileSwitch}>
                    New to MediNest? <button type="button" onClick={() => setTab('register')}>Create Account</button>
                  </div>
                </form>
              </div>
            </div>

            {/* Register Form */}
            <div className={`${styles.formWrapper} ${styles.registerWrapper}`}>
              <div className={styles.panelContent}>
                <h2>Create Account</h2>
                <p className={styles.panelSub}>Start your 14-day free trial today.</p>
                <form className={styles.formSection} onSubmit={handleRegister}>
                  {regError && <div className={styles.errorBox}>{regError}</div>}
                  {regSuccess ? (
                    <div className={styles.successBox}>
                      <h3>✅ Almost there!</h3>
                      <p>Redirecting to onboarding...</p>
                    </div>
                  ) : (
                    <>
                      <button type="button" onClick={handleGoogleLogin} className={styles.googleBtn}>
                         <svg width="20" height="20" viewBox="0 0 24 24">
                           <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                           <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                           <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                           <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                         </svg>
                         Sign up with Google
                      </button>
                      <div className={styles.divider}><span>OR EMAIL</span></div>
                      <div className={styles.fieldGroup}>
                        <div className={styles.field}>
                          <label>Email Address</label>
                          <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="dr.smith@medinest.com" />
                        </div>
                        <div className={styles.field}>
                          <label>Password</label>
                          <input type="password" value={regPass} onChange={e => setRegPass(e.target.value)} placeholder="Min 8 characters" />
                        </div>
                        <div className={styles.field}>
                          <label>Confirm Password</label>
                          <input type="password" value={regConfirm} onChange={e => setRegConfirm(e.target.value)} placeholder="Repeat password" />
                        </div>
                      </div>
                      <button type="submit" className={styles.submitBtn} disabled={regLoading}>
                        {regLoading ? <span className="spinner" /> : 'Create Account →'}
                      </button>
                      <div className={styles.mobileSwitch}>
                        Already a user? <button type="button" onClick={() => setTab('login')}>Sign in</button>
                      </div>
                    </>
                  )}
                </form>
              </div>
            </div>
          </div>

          {/* ── TOGGLE OVERLAY LAYER ── */}
          <div className={styles.toggleContainer}>
            <div className={styles.toggle}>
              {/* Left Toggle (Visible when on Register form) */}
              <div className={`${styles.togglePanel} ${styles.toggleLeft}`}>
                <h3>Already with us?</h3>
                <p>Sign in to access your dashboard, patient records, and AI-powered prescriptions.</p>
                <button className={styles.ctaSwitchBtn} onClick={() => setTab('login')}>Login Now</button>
              </div>
              {/* Right Toggle (Visible when on Login form) */}
              <div className={`${styles.togglePanel} ${styles.toggleRight}`}>
                <h3>New to MediNest?</h3>
                <p>Join over 100+ practitioners who have digitized their clinics with our smart portal.</p>
                <button className={styles.ctaSwitchBtn} onClick={() => setTab('register')}>Create Account</button>
              </div>
            </div>
          </div>
        </main>

        <footer className={styles.footerLinks}>
          <Link href="#">Privacy Policy</Link>
          <Link href="#">Terms of Service</Link>
          <Link href="#">Contact Support</Link>
        </footer>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthPageContent />
    </Suspense>
  );
}
