"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { 
  ArrowRight,
  ShieldCheck,
  Clock,
  TrendingUp,
  Calendar,
  Check,
  Stethoscope,
  FileText,
  CreditCard,
  History,
  Users,
  MessageSquare,
  IndianRupee,
  User,
  Activity,
  Sparkles,
  Monitor
} from "lucide-react";

import { useClinic } from "@/context/ClinicContext";
import { createClient } from "@/lib/supabase/client";
import GoogleOneTap from "@/components/GoogleOneTap";
import TiltedCard from "@/components/TiltedCard";
import PublicFooter from "@/components/PublicFooter";
import "./landing.css";
import SplitReveal from "@/components/animata/preloader/split-reveal";
import TiltWrapper from "@/components/TiltWrapper";
import CountUp from "@/components/CountUp";

const preloaderImages = [
  "/assets/jirova_care_logo.png",
  "/assets/showcase_queue.png",
  "/assets/showcase_prescription.png",
  "/assets/showcase_billing.png",
  "/assets/clinic_consultation.png",
  "/assets/usecase_solo.png",
  "/assets/usecase_group.png",
  "/assets/usecase_specialist.png",
];

export default function LandingPage() {
  const router = useRouter();
  const { user, loading } = useClinic();
  const supabase = createClient();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const [pricingVisible, setPricingVisible] = useState(false);
  const glowRef = useRef<HTMLDivElement>(null);
  const pricingSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push("/portal");
      }
    };
    checkAuth();
  }, [router]);

  useEffect(() => {
    if (loading) return;
    const pricingEl = pricingSectionRef.current;
    if (!pricingEl) return;

    const pricingObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setPricingVisible(true);
          pricingObserver.disconnect();
        }
      },
      { threshold: 0.05 }
    );

    pricingObserver.observe(pricingEl);
    return () => pricingObserver.disconnect();
  }, [loading]);

  useEffect(() => {
    if (loading) return;

    const handleMouse = (e: MouseEvent) => {
      if (glowRef.current) {
        glowRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`;
      }
    };
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    const sections = ["features", "how-it-works", "pricing", "testimonials"];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      {
        rootMargin: "-20% 0px -60% 0px", // triggers when section is active in the main viewing area
      }
    );

    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    window.addEventListener("mousemove", handleMouse, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMouse);
      window.removeEventListener("scroll", handleScroll);
      observer.disconnect();
    };
  }, [loading]);

  if (loading) return null;

  return (
    <div className="landing-root">
      <SplitReveal
        images={preloaderImages}
        backgroundColor="#170337"
        foregroundColor="#ffffff"
        lockScroll
        renderProgress={() => (
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "20px",
            userSelect: "none",
          }}>
            <Image
              src="/assets/jirova_care_logo.png"
              alt="Jivora Care"
              width={52}
              height={52}
              style={{ borderRadius: "14px", opacity: 0.92 }}
            />
            <div style={{ textAlign: "center" }}>
              <p style={{
                color: "#ffffff",
                fontSize: "1.3rem",
                fontWeight: 800,
                letterSpacing: "-0.02em",
                margin: "0 0 4px",
                fontFamily: "'Outfit', 'Inter', sans-serif",
              }}>
                Welcome to Jivora Care
              </p>
              <p style={{
                color: "rgba(255,255,255,0.45)",
                fontSize: "0.75rem",
                fontWeight: 500,
                margin: 0,
                letterSpacing: "0.04em",
                fontFamily: "'Inter', sans-serif",
              }}>
                Intelligent Clinical Workflows
              </p>
            </div>
            <div style={{
              width: "180px",
              height: "2px",
              background: "rgba(255,255,255,0.1)",
              borderRadius: "2px",
              overflow: "hidden",
            }}>
              <div style={{
                height: "100%",
                background: "linear-gradient(90deg, #0d9488, #34d399)",
                borderRadius: "2px",
                animation: "sr-pulse-bar 1.4s ease-in-out infinite",
              }} />
            </div>
            <style>{`
              @keyframes sr-pulse-bar {
                0%   { width: 0%; opacity: 1; }
                60%  { width: 100%; opacity: 1; }
                100% { width: 100%; opacity: 0; }
              }
            `}</style>
          </div>
        )}
      />
      {!user && <GoogleOneTap />}
      <div className="vignette-overlay"></div>
      <div className="bg-glow" ref={glowRef}></div>

      {/* ── NAVBAR ── */}
      <nav className={`glass-nav ${scrolled ? "scrolled" : ""}`}>
        <div className="container nav-container">
          <Link href="/" className="logo">
            <Image
              src="/assets/jirova_care_logo.png"
              alt="Jirova Care"
              width={36}
              height={36}
              className="logo-img"
            />
            <span className="logo-text">Jirova Care</span>
          </Link>

          <div className="nav-links">
            <Link href="#features" className={`nav-link-white ${activeSection === "features" ? "active" : ""}`}>Features</Link>
            <Link href="#how-it-works" className={`nav-link-white ${activeSection === "how-it-works" ? "active" : ""}`}>How It Works</Link>
            <Link href="#pricing" className={`nav-link-white ${activeSection === "pricing" ? "active" : ""}`}>Pricing</Link>
            <Link href="/support" className="nav-link-white">FAQ</Link>
          </div>

          <div className="nav-actions desktop-actions">
            <Link href="/auth?tab=login" className="btn-login-secondary">Login</Link>
            <Link href="/auth?tab=register" className="btn-premium pulse-premium">Start Free Trial</Link>
          </div>

          <div className="mobile-actions">
            <Link href="/auth?tab=login" className="mobile-login-text">Login</Link>
            <button
              className={`hamburger-btn ${mobileMenuOpen ? "open" : ""}`}
              onClick={() => setMobileMenuOpen(o => !o)}
              aria-label="Toggle menu"
            >
              <span></span><span></span><span></span>
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="mobile-menu">
            <Link href="#features" className="mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>Features</Link>
            <Link href="#how-it-works" className="mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>How It Works</Link>
            <Link href="#pricing" className="mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>Pricing</Link>
            <Link href="/support" className="mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>FAQ</Link>
            <div className="mobile-menu-divider"></div>
            <Link href="/auth?tab=login" className="mobile-menu-login" onClick={() => setMobileMenuOpen(false)}>Login</Link>
          </div>
        )}
      </nav>

      <header className="hero-section" id="home">
        <div className="container">
          <div className="hero-grid">
            <motion.div 
              initial={{ opacity: 0, x: -30 }} 
              animate={{ opacity: 1, x: 0 }} 
              className="hero-content"
            >
              <div className="hero-tagline-container">
                <div className="hero-tagline-dot"></div>
                <span className="hero-tagline-text">INTELLIGENT CLINIC OS</span>
              </div>
              <h1 className="hero-title">
                Intelligent Clinical <br />
                Workflows for <br />
                <span className="wa-green-text">Modern Doctors</span>
              </h1>
              <p className="hero-subtitle">
                Simplify documentation, generate digital prescriptions, manage patient billing, and coordinate front-desk queues on a single, secure platform.
              </p>

              <div className="dedicated-hero-btns">
                <Link href="/auth?tab=register" className="btn-premium pulse-premium dedicated-btn" style={{ padding: '1.15rem 1.5rem', fontSize: '1.1rem' }}>
                  Start Free Trial <ArrowRight size={20} style={{ marginLeft: 8 }} />
                </Link>
                <Link href="#showcase" className="btn-hero-secondary dedicated-btn">
                  <Monitor size={20} style={{ marginRight: 8 }} /> How it works
                </Link>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="hero-visual"
            >
              <div className="hero-mockup-scene">

                {/* ── LEFT PANEL (floating cards) ── */}
                <div className="mockup-left-col">
                  {/* WhatsApp Notification Card */}
                  <div className="mockup-card mockup-wa-card">
                    <div className="mwc-header">
                      <div className="mwc-icon-wrap">
                        {/* Official WhatsApp logo SVG */}
                        <svg viewBox="0 0 32 32" width="16" height="16" xmlns="http://www.w3.org/2000/svg">
                          <path d="M16 0C7.163 0 0 7.163 0 16c0 2.82.737 5.47 2.027 7.773L0 32l8.469-2.001A15.93 15.93 0 0016 32c8.837 0 16-7.163 16-16S24.837 0 16 0zm0 29.333a13.27 13.27 0 01-6.791-1.867l-.487-.29-5.028 1.188 1.262-4.896-.318-.503A13.29 13.29 0 012.667 16c0-7.353 5.98-13.333 13.333-13.333S29.333 8.647 29.333 16 23.353 29.333 16 29.333zm7.316-9.98c-.4-.2-2.368-1.168-2.735-1.302-.367-.133-.634-.2-.9.2-.267.4-1.034 1.302-1.268 1.569-.233.267-.467.3-.867.1-.4-.2-1.688-.622-3.214-1.983-1.188-1.06-1.99-2.368-2.223-2.768-.233-.4-.025-.617.175-.816.18-.18.4-.467.6-.7.2-.233.267-.4.4-.667.133-.267.067-.5-.033-.7-.1-.2-.9-2.168-1.234-2.968-.325-.777-.655-.672-.9-.684l-.768-.013c-.267 0-.7.1-1.067.5-.367.4-1.4 1.368-1.4 3.335 0 1.967 1.433 3.868 1.633 4.135.2.267 2.82 4.303 6.835 6.034.955.412 1.7.658 2.282.843.959.305 1.832.262 2.522.159.769-.115 2.368-.968 2.702-1.902.333-.933.333-1.733.233-1.902-.1-.167-.367-.267-.767-.467z" fill="#25D366"/>
                        </svg>
                      </div>
                      <span className="mwc-app">WhatsApp</span>
                    </div>
                    <div className="mwc-body">
                      <p className="mwc-title">Prescription Sent</p>
                      <p className="mwc-sub">to Rahul Verma</p>
                      <p className="mwc-sub">+91 95765 43210</p>
                    </div>
                    <button className="mwc-view-btn">View</button>
                  </div>

                  {/* Digital Prescription Card */}
                  <div className="mockup-card mockup-rx-card">
                    <p className="rx-label">Digital Prescription</p>
                    <div className="rx-lines">
                      <div className="rx-symbol">Rx</div>
                      <div className="rx-line-group">
                        <div className="rx-line long"></div>
                        <div className="rx-line medium"></div>
                        <div className="rx-line short"></div>
                        <div className="rx-line long"></div>
                        <div className="rx-line medium"></div>
                      </div>
                    </div>
                    <div className="rx-sig-row">
                      <div className="rx-sig-squiggle"></div>
                    </div>
                    <div className="rx-badge-generated">Generated</div>
                  </div>
                </div>

                {/* ── CENTER PANEL (main dashboard) ── */}
                <TiltWrapper rotateAmplitude={16} scaleOnHover={1.025} style={{ flex: 1 }}>
                <div className="mockup-center-panel">
                  {/* Dashboard Header */}
                  <div className="dash-header">
                    <div className="dash-greet">
                      <p className="dash-greet-title">Good Morning, Dr. Sharma ☀️</p>
                      <p className="dash-greet-sub">Here&apos;s what&apos;s happening in your clinic today.</p>
                    </div>
                    <div className="dash-header-right">
                      <div className="dash-clinic-info">
                        <p className="dash-clinic-name">Jivora Clinic</p>
                        <p className="dash-clinic-branch">Green Park Branch</p>
                      </div>
                      <div className="dash-notif-btn"><span>🔔</span></div>
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div className="dash-stats-row">
                    <div className="dash-stat-item">
                      <div className="dash-stat-icon dsi-blue"><Calendar size={14} /></div>
                      <div>
                        <p className="dsi-num">12</p>
                        <p className="dsi-lbl">Appointments Today</p>
                      </div>
                    </div>
                    <div className="dash-stat-item">
                      <div className="dash-stat-icon dsi-orange"><Users size={14} /></div>
                      <div>
                        <p className="dsi-num">8</p>
                        <p className="dsi-lbl">Patients Waiting In Queue</p>
                      </div>
                    </div>
                    <div className="dash-stat-item">
                      <div className="dash-stat-icon dsi-green"><IndianRupee size={14} /></div>
                      <div>
                        <p className="dsi-num">₹ 12,450</p>
                        <p className="dsi-lbl">Revenue Today</p>
                      </div>
                    </div>
                    <div className="dash-stat-item">
                      <div className="dash-stat-icon dsi-teal"><FileText size={14} /></div>
                      <div>
                        <p className="dsi-num">96%</p>
                        <p className="dsi-lbl">Prescriptions Digital</p>
                      </div>
                    </div>
                  </div>

                  {/* Bottom two-col area */}
                  <div className="dash-bottom-row">
                    {/* Left: Appointments + Prescriptions */}
                    <div className="dash-left-col">
                      {/* Today Appointments */}
                      <div className="dash-section-header">
                        <span className="dash-sec-title">Today&apos;s Appointments</span>
                        <span className="dash-view-all">View all</span>
                      </div>
                      {[
                        { time: "09:00 AM", name: "Rahul Verma" },
                        { time: "09:30 AM", name: "Priya Singh" },
                        { time: "10:00 AM", name: "Amit Patel" },
                        { time: "10:30 AM", name: "Neha Joshi" },
                      ].map((appt) => (
                        <div key={appt.name} className="dash-appt-row">
                          <span className="appt-time">{appt.time}</span>
                          <span className="appt-name">{appt.name}</span>
                        </div>
                      ))}

                      {/* Recent Prescriptions */}
                      <div className="dash-section-header" style={{ marginTop: "1rem" }}>
                        <span className="dash-sec-title">Recent Prescriptions</span>
                        <span className="dash-view-all">View all</span>
                      </div>
                      {[
                        { name: "Rahul Verma", time: "Today, 09:00 AM" },
                        { name: "Priya Singh", time: "Today, 09:30 AM" },
                        { name: "Amit Patel", time: "Today, 10:00 AM" },
                      ].map((rx) => (
                        <div key={rx.name} className="dash-rx-row">
                          <div className="dash-rx-avatar"><User size={11} /></div>
                          <div className="dash-rx-info">
                            <p className="dash-rx-name">{rx.name}</p>
                            <p className="dash-rx-time">{rx.time}</p>
                          </div>
                          <span className="dash-rx-badge">Sent</span>
                        </div>
                      ))}
                    </div>

                    {/* Right: Live Queue + Revenue */}
                    <div className="dash-right-col">
                      <div className="dash-section-header">
                        <span className="dash-sec-title">Live Queue</span>
                        <span className="dash-view-all">View all</span>
                      </div>
                      <div className="dash-queue-box">
                        <div className="dq-waiting">
                          <p className="dq-num">8</p>
                          <p className="dq-lbl">Patients Waiting</p>
                        </div>
                        <div className="dq-divider"></div>
                        <div className="dq-next">
                          <p className="dq-next-lbl">Next Token</p>
                          <p className="dq-next-num">#09</p>
                        </div>
                      </div>
                      <button className="dq-manage-btn">Manage Queue</button>

                      <div className="dash-section-header" style={{ marginTop: "1rem" }}>
                        <span className="dash-sec-title">Revenue Overview</span>
                      </div>
                      <div className="dash-rev-box">
                        <div className="drb-top">
                          <span className="drb-amount">₹ 12,450</span>
                          <span className="drb-badge">+12%</span>
                        </div>
                        <p className="drb-sub">Today</p>
                        <svg className="drb-chart" viewBox="0 0 140 40" preserveAspectRatio="none">
                          <polyline points="0,35 25,28 50,32 75,20 100,25 115,14 140,8" fill="none" stroke="#0d9488" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          <polyline points="0,35 25,28 50,32 75,20 100,25 115,14 140,8 140,40 0,40" fill="rgba(13,148,136,0.08)" stroke="none"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
                </TiltWrapper>

                {/* ── RIGHT PANEL (feature cards) ── */}
                <div className="mockup-right-col">
                  {[
                    { icon: <Users size={15}/>, color: "#0d9488", bg: "rgba(13,148,136,0.08)", title: "Queue Management", desc: "Smart token system & real-time updates" },
                    { icon: <IndianRupee size={15}/>, color: "#10b981", bg: "rgba(16,185,129,0.08)", title: "Billing & Payments", desc: "Generate bills, collect payments, track dues" },
                    { icon: <User size={15}/>, color: "#8b5cf6", bg: "rgba(139,92,246,0.08)", title: "Patient Management", desc: "Secure records, history, and insights" },
                    { icon: <TrendingUp size={15}/>, color: "#d97706", bg: "rgba(217,119,6,0.08)", title: "Reports & Analytics", desc: "Track growth, revenue & clinic performance" },
                    { icon: <FileText size={15}/>, color: "#3b82f6", bg: "rgba(59,130,246,0.08)", title: "Templates", desc: "Pre-built templates for prescriptions & notes" },
                  ].map((feat, i) => (
                    <div key={i} className="mockup-feat-card">
                      <div className="mfc-icon" style={{ background: feat.bg, color: feat.color }}>{feat.icon}</div>
                      <div className="mfc-info">
                        <p className="mfc-title">{feat.title}</p>
                        <p className="mfc-desc">{feat.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            </motion.div>
          </div>

          {/* Horizontal Mini Features Row */}
          <div className="hero-grid-features">
            <div className="feature-item-mini">
              <div className="mini-icon-circle"><FileText size={18} /></div>
              <h5>Digital Prescriptions</h5>
              <p>Create, sign &amp; share prescriptions instantly</p>
            </div>

            <div className="feature-divider" />

            <div className="feature-item-mini">
              <div className="mini-icon-circle"><Users size={18} /></div>
              <h5>Patient Records</h5>
              <p>Complete medical history in one place</p>
            </div>

            <div className="feature-divider" />

            <div className="feature-item-mini">
              <div className="mini-icon-circle">
                <svg viewBox="0 0 32 32" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16 0C7.163 0 0 7.163 0 16c0 2.82.737 5.47 2.027 7.773L0 32l8.469-2.001A15.93 15.93 0 0016 32c8.837 0 16-7.163 16-16S24.837 0 16 0zm0 29.333a13.27 13.27 0 01-6.791-1.867l-.487-.29-5.028 1.188 1.262-4.896-.318-.503A13.29 13.29 0 012.667 16c0-7.353 5.98-13.333 13.333-13.333S29.333 8.647 29.333 16 23.353 29.333 16 29.333zm7.316-9.98c-.4-.2-2.368-1.168-2.735-1.302-.367-.133-.634-.2-.9.2-.267.4-1.034 1.302-1.268 1.569-.233.267-.467.3-.867.1-.4-.2-1.688-.622-3.214-1.983-1.188-1.06-1.99-2.368-2.223-2.768-.233-.4-.025-.617.175-.816.18-.18.4-.467.6-.7.2-.233.267-.4.4-.667.133-.267.067-.5-.033-.7-.1-.2-.9-2.168-1.234-2.968-.325-.777-.655-.672-.9-.684l-.768-.013c-.267 0-.7.1-1.067.5-.367.4-1.4 1.368-1.4 3.335 0 1.967 1.433 3.868 1.633 4.135.2.267 2.82 4.303 6.835 6.034.955.412 1.7.658 2.282.843.959.305 1.832.262 2.522.159.769-.115 2.368-.968 2.702-1.902.333-.933.333-1.733.233-1.902-.1-.167-.367-.267-.767-.467z" fill="#0d9488"/>
                </svg>
              </div>
              <h5>WhatsApp Integration</h5>
              <p>Send prescriptions, reminders &amp; follow-ups</p>
            </div>

            <div className="feature-divider" />

            <div className="feature-item-mini">
              <div className="mini-icon-circle"><Calendar size={18} /></div>
              <h5>Smart Follow-Ups</h5>
              <p>Reduce missed revisits and improve retention</p>
            </div>

            <div className="feature-divider" />

            <div className="feature-item-mini">
              <div className="mini-icon-circle"><Monitor size={18} /></div>
              <h5>Multi-Device Access</h5>
              <p>Manage your clinic from anywhere</p>
            </div>
          </div>

          {/* Trust Banner */}
          <div className="trust-banner-container">
            <ShieldCheck size={16} />
            <span>Trusted by modern clinics to deliver better care every day.</span>
          </div>
        </div>
      </header>

      {/* ── PROBLEM / PAIN POINTS ── */}
      <section className="section-v3" id="problem">
        <div className="container center">
          <h2 className="section-title">Why clinics lose operational efficiency</h2>
          <p className="section-subtitle">Manual record keeping is slow. Upgrade to a streamlined documentation workflow.</p>
          
          <div className="pain-grid">
            <div className="simple-card">
              <div className="pain-card">
                <div className="pain-icon" style={{ background: 'rgba(13, 148, 136, 0.08)', color: '#0d9488' }}><Clock size={24}/></div>
                <h3>Paper Bottlenecks</h3>
                <p>Writing physical prescriptions and looking up past records manually delays consultations and causes patient queue backlogs.</p>
              </div>
            </div>
            <div className="simple-card">
              <div className="pain-card">
                <div className="pain-icon" style={{ background: 'rgba(59, 130, 246, 0.08)', color: '#3b82f6' }}><History size={24}/></div>
                <h3>Fragmented History</h3>
                <p>Retrieving past treatments, active medication details, and allergy warnings is difficult when logs are scattered across paper charts.</p>
              </div>
            </div>
            <div className="simple-card">
              <div className="pain-card">
                <div className="pain-icon" style={{ background: 'rgba(99, 102, 241, 0.08)', color: '#6366f1' }}><ShieldCheck size={24}/></div>
                <h3>Billing Disconnection</h3>
                <p>Invoicing fees, generating billing receipts, and recording revenue independently introduces accounting errors and audit stress.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES SECTION ── */}
      <section className="section-v3 wa-dark-bg" id="features">
        <div className="container center">
          <h2 className="section-title">Streamline Your Clinical Operations</h2>
          <p className="section-subtitle">All the documentation and administrative tools you need, integrated securely.</p>
          
          <div className="feature-grid-v5">
            <div className="simple-card">
              <div className="feat-card-v5">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <Stethoscope size={20} style={{ color: '#0d9488' }} />
                  <h3 style={{ margin: 0 }}>Patient Management</h3>
                </div>
                <p>Register profiles, track contact logs, and check historical records inside a single, intuitive interface.</p>
              </div>
            </div>
            <div className="simple-card">
              <div className="feat-card-v5">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <FileText size={20} style={{ color: '#3b82f6' }} />
                  <h3 style={{ margin: 0 }}>Digital Prescriptions</h3>
                </div>
                <p>Quickly generate structured digital scripts, record symptoms, save active doses, and keep consult logs.</p>
              </div>
            </div>
            <div className="simple-card">
              <div className="feat-card-v5">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <CreditCard size={20} style={{ color: '#6366f1' }} />
                  <h3 style={{ margin: 0 }}>Invoicing &amp; Billing</h3>
                </div>
                <p>Generate clean billing receipts, record consultation fee details, and track transaction records.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SEE IT IN ACTION ── */}
      <section className="section-v3" style={{ background: "rgba(13, 148, 136, 0.02)" }} id="showcase">
        <div className="container center">
          <h2 className="section-title">See It In Action</h2>
          <p className="section-subtitle">Watch how Jirova Care handles real clinical workflows in under 2 minutes.</p>

          {/* YouTube video placeholder */}
          <div className="yt-placeholder">
            <div className="yt-inner">
              <div className="yt-play-btn">
                <svg viewBox="0 0 68 48" width="68" height="48">
                  <path d="M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55c-2.93.78-4.63 3.26-5.42 6.19C0 13.05 0 24 0 24s0 10.95 1.48 16.26c.78 2.93 2.49 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.64-3.26 5.42-6.19C68 34.95 68 24 68 24s0-10.95-1.48-16.26z" fill="#FF0000"/>
                  <path d="M45 24L27 14v20" fill="#fff"/>
                </svg>
              </div>
              <p className="yt-coming-soon">Demo video coming soon</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS SECTION ── */}
      <section className="section-v3" id="how-it-works">
        <div className="container">
          <div className="upgrade-grid">
            <div className="upgrade-visual">
              <TiltedCard
                imageSrc="/assets/clinic_consultation.png"
                altText="Clinical Consultation"
                containerHeight="100%"
                containerWidth="100%"
                imageHeight="100%"
                imageWidth="100%"
                rotateAmplitude={6}
                scaleOnHover={1.02}
                displayOverlayContent={false}
              />
            </div>
            <div className="upgrade-content">
              <h2 className="section-title-left" style={{ fontSize: '3rem', fontWeight: 900, marginBottom: '1rem' }}>The Jivora Workflow</h2>
              <p className="upgrade-sub">Built to simplify every stage of a patient visit.</p>
              
              <div className="step-list">
                <div className="step-item">
                  <div className="step-num-wa">01</div>
                  <div className="step-info">
                    <h3>Patient Added to Queue</h3>
                    <p>Real-time registration and smart waiting list management.</p>
                  </div>
                </div>
                <div className="step-item">
                  <div className="step-num-wa">02</div>
                  <div className="step-info">
                    <h3>Consultation Completed</h3>
                    <p>Digital prescriptions and structured clinical records generated instantly.</p>
                  </div>
                </div>
                <div className="step-item">
                  <div className="step-num-wa">03</div>
                  <div className="step-info">
                    <h3>Prescription Delivered</h3>
                    <p>Secure WhatsApp delivery with automatic billing and record storage.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── USE CASES SECTION ── */}
      <section className="section-v3 wa-dark-bg" id="use-cases">
        <div className="container center">
          <h2 className="section-title">Powerful Use Cases</h2>
          <p className="section-subtitle">Real-world examples of how Jirova Care transforms clinic workflows.</p>
          
          <div className="showcase-grid">
            <div className="showcase-card">
              <div className="showcase-img-container">
                <TiltedCard
                  imageSrc="/assets/usecase_solo.png"
                  altText="Solo Practice Room"
                  containerHeight="100%"
                  containerWidth="100%"
                  imageHeight="100%"
                  imageWidth="100%"
                  rotateAmplitude={12}
                  scaleOnHover={1.05}
                  displayOverlayContent={true}
                  overlayContent={
                    <div style={{ padding: '1.5rem', background: 'linear-gradient(to top, rgba(8,14,20,0.85) 0%, rgba(8,14,20,0.2) 60%, transparent 100%)', height: '100%', width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', borderRadius: '15px' }}>
                      <div className="showcase-badge" style={{ position: 'absolute', top: '1rem', right: '1rem' }}>SOLO PRACTICE</div>
                      <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'white' }}>Solo Practitioners</h3>
                      <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.95rem', color: '#e2e8f0' }}>Manage patients, prescriptions, and records independently with zero overhead.</p>
                    </div>
                  }
                />
              </div>
            </div>
            <div className="showcase-card">
              <div className="showcase-img-container">
                <TiltedCard
                  imageSrc="/assets/usecase_group.png"
                  altText="Group Practices Lobby"
                  containerHeight="100%"
                  containerWidth="100%"
                  imageHeight="100%"
                  imageWidth="100%"
                  rotateAmplitude={12}
                  scaleOnHover={1.05}
                  displayOverlayContent={true}
                  overlayContent={
                    <div style={{ padding: '1.5rem', background: 'linear-gradient(to top, rgba(8,14,20,0.85) 0%, rgba(8,14,20,0.2) 60%, transparent 100%)', height: '100%', width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', borderRadius: '15px' }}>
                      <div className="showcase-badge" style={{ position: 'absolute', top: '1rem', right: '1rem' }}>MULTI-DOCTOR</div>
                      <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'white' }}>Group Practices</h3>
                      <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.95rem', color: '#e2e8f0' }}>Coordinate front-desk reception, multiple practitioner schedules, and patient files.</p>
                    </div>
                  }
                />
              </div>
            </div>
            <div className="showcase-card">
              <div className="showcase-img-container">
                <TiltedCard
                  imageSrc="/assets/usecase_specialist.png"
                  altText="Specialist Doctor examining data"
                  containerHeight="100%"
                  containerWidth="100%"
                  imageHeight="100%"
                  imageWidth="100%"
                  rotateAmplitude={12}
                  scaleOnHover={1.05}
                  displayOverlayContent={true}
                  overlayContent={
                    <div style={{ padding: '1.5rem', background: 'linear-gradient(to top, rgba(8,14,20,0.85) 0%, rgba(8,14,20,0.2) 60%, transparent 100%)', height: '100%', width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', borderRadius: '15px' }}>
                      <div className="showcase-badge" style={{ position: 'absolute', top: '1rem', right: '1rem' }}>SPECIALISTS</div>
                      <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'white' }}>Specialized Centers</h3>
                      <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.95rem', color: '#e2e8f0' }}>Custom intake details, billing logs, and history for any medical specialty.</p>
                    </div>
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS SECTION ── */}
      <section className="section-v3 wa-dark-bg" id="testimonials">
        <div className="container center">
          <h2 className="section-title">Loved by Practitioners</h2>
          <p className="section-subtitle">See how clinics are upgrading their clinical documentation speed.</p>
          
          <div className="pain-grid" style={{ marginTop: '2rem' }}>
            <div className="simple-card">
              <div className="pain-card" style={{ padding: '2rem' }}>
                <p style={{ fontStyle: 'italic', color: '#475569', fontSize: '15px', lineHeight: 1.7, marginBottom: '20px' }}>
                  "Jirova Care has cut our patient intake documentation time in half. The queue management between our front desk and consultation room is completely seamless."
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Image
                    src="/assets/amit.png"
                    alt="Dr. Amit Sharma"
                    width={40}
                    height={40}
                    style={{ borderRadius: "50%", objectFit: "cover" }}
                  />
                  <div style={{ textAlign: 'left' }}>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#0f172a' }}>Dr. Amit Sharma</h4>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>General Consultant</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="simple-card">
              <div className="pain-card" style={{ padding: '2rem' }}>
                <p style={{ fontStyle: 'italic', color: '#475569', fontSize: '15px', lineHeight: 1.7, marginBottom: '20px' }}>
                  "Generating digital prescription PDFs and sending them via WhatsApp has greatly improved patient compliance. Our follow-ups are much easier to track."
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Image
                    src="/assets/ritu.png"
                    alt="Dr. Ritu Verma"
                    width={40}
                    height={40}
                    style={{ borderRadius: "50%", objectFit: "cover" }}
                  />
                  <div style={{ textAlign: 'left' }}>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#0f172a' }}>Dr. Ritu Verma</h4>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Pediatrician</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="simple-card">
              <div className="pain-card" style={{ padding: '2rem' }}>
                <p style={{ fontStyle: 'italic', color: '#475569', fontSize: '15px', lineHeight: 1.7, marginBottom: '20px' }}>
                  "The billing logs and clinic performance metrics give me total visibility over my clinic metrics. I can audit the day's records in less than five minutes."
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Image
                    src="/assets/sk.png"
                    alt="Dr. S. K. Nair"
                    width={40}
                    height={40}
                    style={{ borderRadius: "50%", objectFit: "cover" }}
                  />
                  <div style={{ textAlign: 'left' }}>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#0f172a' }}>Dr. S. K. Nair</h4>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Cardiologist</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING SECTION ── */}
      <section className="section-v3" id="pricing" ref={pricingSectionRef}>
        <div className="container center">
          <h2 className="section-title">Simple, Flat Pricing</h2>
          <p className="section-subtitle" style={{ whiteSpace: 'pre-line' }}>
            Everything you need to run your practice.{"\n"}
            Includes secure patient records, updates, and a 14-day free trial.
          </p>

          <div className="beta-alert-banner">
            🎉 All plans are currently at <strong style={{ fontSize: '1.15em', fontWeight: 900, color: '#0d9488' }}><CountUp from={10} to={90} duration={1.2} startWhen={pricingVisible} roundTo={10} />%</strong> off during our beta testing period.
          </div>
          
          <div className="pricing-grid-v5">
            <Link href="/auth?tab=register" className="price-card-link">
              <div className="price-card-v5 glass-card">
                <span className="p-tier">Starter</span>
                <p className="p-subtitle" style={{ fontSize: '0.85rem', color: '#64748b', margin: '-8px 0 16px 0' }}>For solo practitioners</p>
                <div className="p-price">
                  <span className="p-price-original">₹999</span>
                  ₹<CountUp from={999} to={99} duration={1.2} startWhen={pricingVisible} roundTo={10} className="count-up-price" /><span style={{ fontSize: '1rem', color: '#64748b', fontWeight: 'normal' }}>/mo</span>
                </div>
                <ul className="p-features">
                  <li><Check size={14} className="text-wa"/> 1 Doctor Seat</li>
                  <li><Check size={14} className="text-wa"/> Digital Prescriptions</li>
                  <li><Check size={14} className="text-wa"/> Patient Directory &amp; History</li>
                  <li><Check size={14} className="text-wa"/> Invoicing &amp; Receipts</li>
                  <li><Check size={14} className="text-wa"/> WhatsApp Sharing</li>
                  <li><Check size={14} className="text-wa"/> Daily Summary Reports</li>
                  <li><Check size={14} className="text-wa"/> Email Support</li>
                </ul>
                <div className="btn-outline-wa w-full" style={{ textAlign: 'center' }}>Start Free Trial</div>
              </div>
            </Link>

            <Link href="/auth?tab=register" className="price-card-link">
              <div className="price-card-v5 glass-card featured-wa">
                <div className="p-popular-wa">POPULAR</div>
                <span className="p-tier" style={{ color: '#0d9488' }}>Clinic</span>
                <p className="p-subtitle" style={{ fontSize: '0.85rem', color: '#64748b', margin: '-8px 0 16px 0' }}>For growing clinics</p>
                <div className="p-price">
                  <span className="p-price-original">₹2,499</span>
                  ₹<CountUp from={2499} to={249} duration={1.2} separator="," startWhen={pricingVisible} roundTo={10} className="count-up-price" /><span style={{ fontSize: '1rem', color: '#64748b', fontWeight: 'normal' }}>/mo</span>
                </div>
                <ul className="p-features">
                  <li><Check size={14} className="text-wa" style={{ color: '#0d9488' }}/> Up to 5 Doctor Seats</li>
                  <li><Check size={14} className="text-wa" style={{ color: '#0d9488' }}/> Front Desk Dashboard</li>
                  <li><Check size={14} className="text-wa" style={{ color: '#0d9488' }}/> Live Queue Management</li>
                  <li><Check size={14} className="text-wa" style={{ color: '#0d9488' }}/> Analytics Dashboard</li>
                  <li><Check size={14} className="text-wa" style={{ color: '#0d9488' }}/> Priority Support</li>
                </ul>
                <div className="btn-premium w-full pulse-premium" style={{ textAlign: 'center' }}>Start Free Trial</div>
              </div>
            </Link>

            <Link href="/auth?tab=register" className="price-card-link">
              <div className="price-card-v5 glass-card">
                <div className="p-popular-wa" style={{ background: '#6366f1', color: 'white' }}>BEST VALUE</div>
                <span className="p-tier">Professional</span>
                <p className="p-subtitle" style={{ fontSize: '0.85rem', color: '#64748b', margin: '-8px 0 16px 0' }}>For multi-doctor practices</p>
                <div className="p-price">
                  <span className="p-price-original">₹4,999</span>
                  ₹<CountUp from={4999} to={499} duration={1.2} separator="," startWhen={pricingVisible} roundTo={10} className="count-up-price" /><span style={{ fontSize: '1rem', color: '#64748b', fontWeight: 'normal' }}>/mo</span>
                </div>
                <ul className="p-features">
                  <li><Check size={14} className="text-wa"/> Up to 15 Doctor Seats</li>
                  <li><Check size={14} className="text-wa"/> Multi-Doctor Coordination</li>
                  <li><Check size={14} className="text-wa"/> Advanced Analytics</li>
                  <li><Check size={14} className="text-wa"/> Priority Assistance</li>
                </ul>
                <div className="btn-outline-wa w-full" style={{ textAlign: 'center' }}>Start Free Trial</div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="final-cta-v5">
        <div className="container center">
          <div className="final-cta-box">
            <h2>Ready to upgrade your <br/><span className="wa-green-text">Clinical Workflows?</span></h2>
            <p style={{ margin: '1rem 0 2rem 0', opacity: 0.8, color: '#475569' }}>Setup takes less than 5 minutes. Start your 14-day free trial now.</p>
            <Link href="/auth?tab=register" className="btn-premium pulse-premium shadow-wa" style={{ padding: "1.25rem 3rem", fontSize: "1.25rem" }}>Get Started Now</Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <PublicFooter />
    </div>
  );
}
