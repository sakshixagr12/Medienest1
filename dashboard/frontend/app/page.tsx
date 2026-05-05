'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useClinic } from '@/context/ClinicContext';
import { createClient } from '@/lib/supabase/client';
import GoogleOneTap from '@/components/GoogleOneTap';
import styles from './page.module.css';

export default function LandingPage() {
  const router = useRouter();
  const { user, loading } = useClinic();
  const supabase = createClient();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Example SVG Icon constants for clean minimal design
  const IconCheck = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>;
  
  if (loading) return null;

  return (
    <div className={styles.page}>
      {!user && <GoogleOneTap />}
      {/* ── NAV ── */}
      <nav className={styles.nav}>
        <Link href="/" className={styles.navLogo}>
           <Image src="/assets/medinest_logo.png" alt="MediNest" width={32} height={32} />
           <span>MediNest</span>
        </Link>
        <div className={styles.navLinks}>
           <a href="#features">Features</a>
           <a href="#demo">Demo</a>
           <a href="#pricing">Pricing</a>
           <Link href="/auth?tab=login">Login</Link>
        </div>
        <div className={styles.navCta}>
           <Link href="/auth?tab=register" className={styles.btnSolidNav}>Get Started</Link>
        </div>
        <button 
          className={styles.mobileMenuBtn} 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {mobileMenuOpen 
              ? <><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></>
              : <><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></>
            }
          </svg>
        </button>
      </nav>

      {/* MOBILE MENU OVERLAY */}
      {mobileMenuOpen && (
        <div className={styles.mobileMenuOverlay}>
           <div className={styles.navLinks}>
             <a href="#features" onClick={() => setMobileMenuOpen(false)}>Features</a>
             <a href="#demo" onClick={() => setMobileMenuOpen(false)}>Demo</a>
             <a href="#pricing" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
             <Link href="/auth?tab=login" onClick={() => setMobileMenuOpen(false)}>Login</Link>
           </div>
           <Link href="/auth?tab=register" className={styles.btnSolidNav} onClick={() => setMobileMenuOpen(false)}>Get Started</Link>
        </div>
      )}

      {/* ── HERO ── */}
      <header className={styles.hero}>
        <div className={styles.heroContent}>
           <div className={styles.badgeTop}>
             <span style={{ color: 'var(--lp-secondary)', fontSize: 16 }}>✦</span> Join 100+ Indian practitioners today
           </div>
           <h1 className={styles.heroH1}>
             Run your clinic the<br /><span>smart way.</span>
           </h1>
           <p className={styles.heroDesc}>
             From patient visits to prescription in under <strong>30 seconds</strong>. 
             Automate follow-ups and explore treatment paths with full AI-built for Indian practitioners.
           </p>
           <div className={styles.heroCta}>
             <Link href="/auth?tab=register" className={styles.btnHeroPrimary}>Start 14-Day Free Trial</Link>
             <a href="#demo" className={styles.btnHeroSecondary}>See Live Demo</a>
           </div>
        </div>
        <div className={styles.heroImageContainer}>
           <div className={styles.heroImageMockup}>
             <div className={styles.heroMockNav}>
                <div className={styles.mockDot} style={{ background: '#ef4444' }}></div>
                <div className={styles.mockDot} style={{ background: '#eab308' }}></div>
                <div className={styles.mockDot} style={{ background: '#22c55e' }}></div>
                <div style={{ marginLeft: 12, height: 8, width: 80, background: 'rgba(255,255,255,0.1)', borderRadius: 4 }}></div>
             </div>
             <div className={styles.mockBody}>
                <div style={{ display: 'flex', gap: 16 }}>
                  <div style={{ flex: 1, height: 120, background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}></div>
                  <div style={{ flex: 2, height: 120, background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                  <div className={styles.mockSkeleton}></div>
                  <div className={styles.mockSkeleton}></div>
                  <div className={styles.mockSkeleton}></div>
                </div>
                <div style={{ height: 200, background: 'rgba(255,255,255,0.05)', borderRadius: 8, marginTop: 16 }}></div>
             </div>
           </div>
        </div>
      </header>

      {/* ── FEATURES ── */}
      <section id="features" className={`${styles.section} ${styles.greySection}`}>
        <div className={styles.sectionCenter}>
          <span className={styles.sectionLabel}>Why MediNest?</span>
          <h2 className={styles.sectionTitle}>Built for the modern clinic hub.</h2>
          <p style={{ color: 'var(--lp-text-muted)', fontSize: 18, marginTop: 8 }}>Designed to fit seamlessly into the rhythm of busy Indian practices.</p>
        </div>
        <div className={styles.featuresGrid}>
           <div className={styles.featureCard}>
             <div className={styles.iconBox}>
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
             </div>
             <h3>Patient actually follow your advice</h3>
             <p>Hindi/English explanations tailored for your patient's understanding.</p>
           </div>

           <div className={styles.featureCard}>
             <div className={styles.iconBox}>
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>
             </div>
             <h3>Never lose a patient again</h3>
             <p>Automated WhatsApp follow-ups that keep patients coming back.</p>
           </div>

           <div className={styles.featureCard}>
             <div className={styles.iconBox}>
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
             </div>
             <h3>Everything on WhatsApp</h3>
             <p>Instant prescriptions and treatment reminders sent directly to their phones.</p>
           </div>

           <div className={styles.featureCard}>
             <div className={styles.iconBox}>
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
             </div>
             <h3>Made for real Indian clinics</h3>
             <p>Full offline mode and works perfectly on low-end smartphones.</p>
           </div>

           <div className={styles.featureCard}>
             <div className={styles.iconBox}>
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
             </div>
             <h3>Complete Patient History</h3>
             <p>Access every past visit, prescription, and report in just 1 single click.</p>
           </div>

           <div className={styles.featureCard}>
             <div className={styles.iconBox}>
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
             </div>
             <h3>Smart Billing & Exports</h3>
             <p>Frictionless non-ready billing and simple daily performance analytics.</p>
           </div>
        </div>
      </section>

      {/* ── AUTOMATION ── */}
      <section className={`${styles.section} ${styles.automationSection}`}>
         <div className={styles.whatsappMock}>
            <div className={styles.waHeader}>
               <div className={styles.waAvatar}>M</div>
               <div>
                 <p style={{ fontWeight: 800, margin: 0, fontSize: 16 }}>MediNest Assistant</p>
                 <p style={{ margin: 0, fontSize: 12, color: '#10b981' }}>Active Online</p>
               </div>
            </div>
            <div className={styles.waBubble}>Hello Dr. Pradeep, Patient Rajesh Kumar is due for his hypertension follow-up today. Should I send the reminder?</div>
            <div className={`${styles.waBubble} ${styles.waBubbleSelf}`}>Yes, please. And alert me immediately after he responded.</div>
            <div className={styles.waBubble}>Done! ✅ I've automated the text mark & alerts. Enjoy your clinical visits! Thank you!</div>
         </div>
         <div style={{ padding: '0 20px' }}>
            <h2 className={styles.sectionTitle}>Let MediNest<br />do the work.</h2>
            <div className={styles.autoCheck}>
               <div className={styles.autoCheckIcon}><IconCheck /></div>
               Auto follow-ups
            </div>
            <p style={{ color: 'var(--lp-text-muted)', marginLeft: 40, marginTop: -12, marginBottom: 24 }}>Never miss a critical check-up again.</p>

            <div className={styles.autoCheck}>
               <div className={styles.autoCheckIcon}><IconCheck /></div>
               WhatsApp sharing
            </div>
            <p style={{ color: 'var(--lp-text-muted)', marginLeft: 40, marginTop: -12, marginBottom: 24 }}>Connect with patients on their favorite platform.</p>

            <div className={styles.autoCheck}>
               <div className={styles.autoCheckIcon}><IconCheck /></div>
               AI treatment explanations
            </div>
            <p style={{ color: 'var(--lp-text-muted)', marginLeft: 40, marginTop: -12, marginBottom: 24 }}>Greater understanding leads to better health outcomes.</p>
         </div>
      </section>

      {/* ── VIDEO DEMO ── */}
      <section id="demo" className={styles.videoSection}>
         <h2 className={styles.videoTitle}>See MediNest in action</h2>
         <div className={styles.videoWrapper}>
            <div className={styles.playBtn}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            </div>
         </div>
         <p style={{ marginTop: 32, fontSize: 18, opacity: 0.8 }}>Watch how to generate a prescription in under 30 seconds.</p>
      </section>

      {/* ── WORKFLOW ── */}
      <section className={styles.section}>
         <div className={styles.sectionCenter} style={{ marginBottom: 80 }}>
           <h2 className={styles.sectionTitle}>From Paper to Digital in 3 Simple Steps</h2>
         </div>
         <div className={styles.stepGrid}>
            <div className={styles.stepCard}>
               <div className={styles.stepNum}>01</div>
               <h3>Find Patient</h3>
               <p>Search by name or number. All their history pops up instantly.</p>
            </div>
            <div className={styles.stepCard}>
               <div className={styles.stepNum}>02</div>
               <h3>Generate Rx</h3>
               <p>Tap symptoms and dosage. AI suggests the treatment plan.</p>
            </div>
            <div className={styles.stepCard}>
               <div className={styles.stepNum}>03</div>
               <h3>Print & Share</h3>
               <p>One click to print or send via WhatsApp immediately.</p>
            </div>
         </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className={`${styles.section} ${styles.greySection}`}>
         <div className={styles.sectionCenter}>
           <h2 className={styles.sectionTitle} style={{ paddingTop: 60 }}>Simple, Transparent Pricing</h2>
         </div>
         <div className={styles.pricingGrid}>
            <div className={styles.priceCard}>
               <p className={styles.priceTitle}>Starter Plan</p>
               <h3 className={styles.priceVal}>₹0 <span>/ mo</span></h3>
               <ul className={styles.priceList}>
                 <li><IconCheck /> 5 patients / day</li>
                 <li><IconCheck /> Full digital records</li>
                 <li><IconCheck /> WhatsApp sharing</li>
               </ul>
               <Link href="/auth?tab=register" className={styles.btnPrice} style={{ background: 'white', color: 'var(--lp-primary)', border: '2px solid var(--lp-primary)' }}>Get Started</Link>
            </div>
            <div className={`${styles.priceCard} ${styles.priceCardPopular}`}>
               <div style={{ position: 'absolute', top: 24, right: 24, background: 'rgba(255,255,255,0.2)', color: 'white', padding: '6px 16px', borderRadius: 100, fontSize: 12, fontWeight: 800, letterSpacing: 0.5 }}>RECOMMENDED</div>
               <p className={styles.priceTitle}>Professional Plan</p>
               <h3 className={styles.priceVal}>₹999 <span>/ mo</span></h3>
               <ul className={styles.priceList}>
                 <li><IconCheck /> Unlimited prescriptions</li>
                 <li><IconCheck /> AI patient summaries</li>
                 <li><IconCheck /> Automated follow-up alerts</li>
                 <li><IconCheck /> Advanced clinical analytics</li>
               </ul>
               <Link href="/auth?tab=register" className={`${styles.btnPrice} ${styles.btnPricePrimary}`}>Start Free Trial</Link>
            </div>
         </div>
      </section>

      {/* ── FAQ ── */}
      <section className={styles.section}>
         <div className={styles.sectionCenter}>
           <h2 className={styles.sectionTitle}>Why doctors love us</h2>
         </div>
         <div className={styles.faqContainer}>
            {[
              { q: 'Is my patient data safe?', a: 'We use bank-grade encryption. Your data is private, secured on local servers, and only accessible by you.' },
              { q: 'Does it work without internet?', a: 'Yes! The Offline Mode allows you to consult and prescribe. Data syncs automatically once you\'re back online.' },
              { q: 'How does Auto WhatsApp sharing work?', a: 'After you finish a consultation, MediNest can automatically trigger a professional PDF prescription to the patient\'s WhatsApp number.' }
            ].map((faq, i) => (
              <div key={i} className={styles.faqItem}>
                <p>{faq.q}</p>
                <p>{faq.a}</p>
              </div>
            ))}
         </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className={styles.footer}>
         <div className={styles.footerGrid}>
            <div className={styles.footerCol}>
               <Link href="/" className={styles.navLogo} style={{ marginBottom: 20 }}>
                 <Image src="/assets/medinest_logo.png" alt="MediNest" width={32} height={32} />
                 <span>MediNest</span>
               </Link>
               <p style={{ fontSize: 14, opacity: 0.7, lineHeight: 1.6, marginTop: 16 }}>Intelligent Solutions for Modern Healthcare practitioners across India.</p>
            </div>
            <div className={styles.footerCol}>
               <ul>
                 <li><Link href="/privacy">Privacy Policy</Link></li>
                 <li><Link href="/terms">Terms of Service</Link></li>
                 <li><Link href="/support">Contact Support</Link></li>
                 <li><Link href="/auth?tab=login">Clinic Login</Link></li>
               </ul>
            </div>
            <div className={styles.footerCol} style={{ gridColumn: 'span 2', textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', opacity: 0.5, fontSize: 13 }}>
               © 2026 MediNest Intelligent Healthcare. All rights reserved.
            </div>
         </div>
      </footer>
    </div>
  );
}
