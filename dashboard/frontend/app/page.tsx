"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { 
  Zap, 
  ArrowRight,
  ShieldCheck,
  Clock,
  TrendingUp,
  Calendar,
  Check,
  CheckCircle,
  Stethoscope,
  Heart,
  FileText,
  CreditCard,
  History
} from "lucide-react";

import { useClinic } from "@/context/ClinicContext";
import { createClient } from "@/lib/supabase/client";
import GoogleOneTap from "@/components/GoogleOneTap";
import TiltedCard from "@/components/TiltedCard";
import BorderGlow from "@/components/BorderGlow";
import PublicFooter from "@/components/PublicFooter";

export default function LandingPage() {
  const router = useRouter();
  const { user, loading } = useClinic();
  const supabase = createClient();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("home");

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
    const handleMouse = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);

      const sections = ["features", "how-it-works", "pricing", "testimonials"];
      for (const id of sections) {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top >= 0 && rect.top <= 300) {
            setActiveSection(id);
          }
        }
      }
    };
    window.addEventListener("mousemove", handleMouse);
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("mousemove", handleMouse);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  if (loading) return null;

  const faqs = [
    {
      q: "How does the digital prescription delivery work?",
      qClean: "How does the digital prescription delivery work?",
      a: "After you complete a patient consultation, Jirova Care automatically triggers a secure PDF prescription link which you can share directly to the patient's WhatsApp number with a single click.",
      aClean: "After you complete a patient consultation, Jirova Care automatically triggers a secure PDF prescription link which you can share directly to the patient's WhatsApp number with a single click."
    },
    {
      q: "Is patient medical data secure?",
      qClean: "Is patient medical data secure?",
      a: "Absolutely. All patient health records, prescriptions, and clinic logs are encrypted both in transit and at rest, utilizing robust database security and strict permission layers.",
      aClean: "Absolutely. All patient health records, prescriptions, and clinic logs are encrypted both in transit and at rest, utilizing robust database security and strict permission layers."
    },
    {
      q: "Can my front-desk team manage patient intake?",
      qClean: "Can my front-desk team manage patient intake?",
      a: "Yes. Jirova Care features a dedicated queue management system. Your front desk can register patients, add them to the queue, and they will immediately appear on the doctor's dashboard.",
      aClean: "Yes. Jirova Care features a dedicated queue management system. Your front desk can register patients, add them to the queue, and they will immediately appear on the doctor's dashboard."
    }
  ];

  return (
    <div className="landing-root">
      {!user && <GoogleOneTap />}
      <div className="bg-glow" style={{ left: mousePos.x, top: mousePos.y }}></div>
      <div className="grid-overlay"></div>

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
            <Link href="#how-it-works" className={`nav-link-white ${activeSection === "how-it-works" ? "active" : ""}`}>Solutions</Link>
            <Link href="#pricing" className={`nav-link-white ${activeSection === "pricing" ? "active" : ""}`}>Pricing</Link>
            <Link href="/support" className="nav-link-white">FAQ</Link>
          </div>

          <div className="nav-actions desktop-actions">
            <Link href="/auth?tab=login" className="btn-login-secondary">Login</Link>
            <Link href="/auth?tab=register" className="btn-premium pulse-premium">Get Started</Link>
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
            <Link href="#how-it-works" className="mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>Solutions</Link>
            <Link href="#pricing" className="mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>Pricing</Link>
            <Link href="/support" className="mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>FAQ</Link>
            <div className="mobile-menu-divider"></div>
            <Link href="/auth?tab=login" className="mobile-menu-login" onClick={() => setMobileMenuOpen(false)}>Login</Link>
          </div>
        )}
      </nav>

      {/* ── HERO SECTION ── */}
      <header className="hero-section" id="home">
        <div className="container">
          <div className="hero-grid">
            <motion.div 
              initial={{ opacity: 0, x: -30 }} 
              animate={{ opacity: 1, x: 0 }} 
              className="hero-content"
            >
              <div className="wa-dot-container">
                <span className="wa-dot"></span>
                <span>INTELLIGENT CLINIC OS</span>
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
                  Start 14-Day Free Trial <ArrowRight size={20} style={{ marginLeft: 8 }} />
                </Link>
                <Link href="/support" className="btn-hero-secondary dedicated-btn">
                  <Calendar size={20} style={{ marginRight: 8 }} /> Book a Demo
                </Link>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="hero-visual"
            >
              <div className="wa-mockup-wrapper">
                <TiltedCard
                  imageSrc="/assets/hero_clinic_mockup.png"
                  altText="Clinical Dashboard Mockup"
                  containerHeight="100%"
                  containerWidth="100%"
                  imageHeight="100%"
                  imageWidth="100%"
                  rotateAmplitude={6}
                  scaleOnHover={1.02}
                  displayOverlayContent={false}
                />
              </div>

              <div className="ticker-wrap">
                <div className="ticker-move">
                  <span>Pediatrics</span> • <span>Cardiology</span> • <span>General Practice</span> • <span>Orthopedics</span> • <span>Dermatology</span> • <span>Gynecology</span> • <span>Neurology</span> • <span>Oncology</span> • <span>ENT</span> • <span>Dental</span> •&nbsp;
                  <span>Pediatrics</span> • <span>Cardiology</span> • <span>General Practice</span> • <span>Orthopedics</span> • <span>Dermatology</span> • <span>Gynecology</span> • <span>Neurology</span> • <span>Oncology</span> • <span>ENT</span> • <span>Dental</span>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="hero-stats">
            <div className="stat-item">
              <div className="stat-icon-circle"><Clock size={20} /></div>
              <div>
                <strong>Zero Documentation Bottlenecks</strong>
                <span>Fast prescription logs &amp; AI summaries</span>
              </div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <div className="stat-icon-circle"><Zap size={20} /></div>
              <div>
                <strong>Instant WhatsApp Delivery</strong>
                <span>Prescription links triggered instantly</span>
              </div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <div className="stat-icon-circle"><TrendingUp size={20} /></div>
              <div>
                <strong>Seamless Queue Management</strong>
                <span>Link intake directly to clinical screens</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── PROBLEM / PAIN POINTS ── */}
      <section className="section-v3" id="problem">
        <div className="container center">
          <h2 className="section-title">Why clinics lose operational efficiency</h2>
          <p className="section-subtitle">Manual record keeping is slow. Upgrade to a streamlined documentation workflow.</p>
          
          <div className="pain-grid">
            <BorderGlow animated={true} colors={['#3b82f6', '#14b8a6', '#4f46e5']}>
              <div className="pain-card">
                <div className="pain-icon" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}><Clock size={24}/></div>
                <h3>Paper Bottlenecks</h3>
                <p>Writing physical prescriptions and looking up past records manually delays consultations and causes patient queue backlogs.</p>
              </div>
            </BorderGlow>
            <BorderGlow animated={true} colors={['#3b82f6', '#14b8a6', '#4f46e5']}>
              <div className="pain-card">
                <div className="pain-icon" style={{ background: 'rgba(20,184,166,0.1)', color: '#14b8a6' }}><History size={24}/></div>
                <h3>Fragmented History</h3>
                <p>Retrieving past treatments, active medication details, and allergy warnings is difficult when logs are scattered across paper charts.</p>
              </div>
            </BorderGlow>
            <BorderGlow animated={true} colors={['#3b82f6', '#14b8a6', '#4f46e5']}>
              <div className="pain-card">
                <div className="pain-icon" style={{ background: 'rgba(79,70,229,0.1)', color: '#4f46e5' }}><ShieldCheck size={24}/></div>
                <h3>Billing Disconnection</h3>
                <p>Invoicing fees, generating billing receipts, and recording revenue independently introduces accounting errors and audit stress.</p>
              </div>
            </BorderGlow>
          </div>
        </div>
      </section>

      {/* ── FEATURES SECTION ── */}
      <section className="section-v3 wa-dark-bg" id="features">
        <div className="container center">
          <h2 className="section-title">Streamline Your Clinical Operations</h2>
          <p className="section-subtitle">All the documentation and administrative tools you need, integrated securely.</p>
          
          <div className="feature-grid-v5">
            <BorderGlow animated={true} colors={['#3b82f6', '#14b8a6']}>
              <div className="feat-card-v5">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <Stethoscope size={20} style={{ color: '#3b82f6' }} />
                  <h3 style={{ margin: 0 }}>Patient Management</h3>
                </div>
                <p>Register profiles, track contact logs, and check historical records inside a single, intuitive interface.</p>
              </div>
            </BorderGlow>
            <BorderGlow animated={true} colors={['#3b82f6', '#14b8a6']}>
              <div className="feat-card-v5">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <FileText size={20} style={{ color: '#14b8a6' }} />
                  <h3 style={{ margin: 0 }}>Digital Prescriptions</h3>
                </div>
                <p>Quickly generate structured digital scripts, record symptoms, save active doses, and keep consult logs.</p>
              </div>
            </BorderGlow>
            <BorderGlow animated={true} colors={['#3b82f6', '#14b8a6']}>
              <div className="feat-card-v5">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <CreditCard size={20} style={{ color: '#6366f1' }} />
                  <h3 style={{ margin: 0 }}>Invoicing &amp; Billing</h3>
                </div>
                <p>Generate clean billing receipts, record consultation fee details, and track transaction records.</p>
              </div>
            </BorderGlow>
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
              <h2 className="section-title-left" style={{ fontSize: '3rem', fontWeight: 900, marginBottom: '1rem' }}>Simple Consultation Flow</h2>
              <p className="upgrade-sub">Streamlined coordination from the waiting room to the pharmacy.</p>
              
              <div className="step-list">
                <div className="step-item">
                  <div className="step-num-wa">01</div>
                  <div className="step-info">
                    <h3>Register Patient</h3>
                    <p>Intake staff register the patient profile and add them directly to the active consultation queue.</p>
                  </div>
                </div>
                <div className="step-item">
                  <div className="step-num-wa">02</div>
                  <div className="step-info">
                    <h3>Consultation &amp; Prescription</h3>
                    <p>The practitioner conducts the consult, logging symptoms, and generating the digital prescription sheet.</p>
                  </div>
                </div>
                <div className="step-item">
                  <div className="step-num-wa">03</div>
                  <div className="step-info">
                    <h3>Billing &amp; Delivery</h3>
                    <p>Invoices are generated instantly and a secure prescription link is delivered directly to the patient's phone.</p>
                  </div>
                </div>
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
            <BorderGlow animated={false} fillOpacity={0.1}>
              <div className="pain-card" style={{ padding: '2rem' }}>
                <p style={{ fontStyle: 'italic', color: '#cbd5e1', fontSize: '15px', lineHeight: 1.7, marginBottom: '20px' }}>
                  "Jirova Care has cut our patient intake documentation time in half. The queue management between our front desk and consultation room is completely seamless."
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>DR</div>
                  <div style={{ textAlign: 'left' }}>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: 'white' }}>Dr. Amit Sharma</h4>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>General Consultant</span>
                  </div>
                </div>
              </div>
            </BorderGlow>
            <BorderGlow animated={false} fillOpacity={0.1}>
              <div className="pain-card" style={{ padding: '2rem' }}>
                <p style={{ fontStyle: 'italic', color: '#cbd5e1', fontSize: '15px', lineHeight: 1.7, marginBottom: '20px' }}>
                  "Generating digital prescription PDFs and sending them via WhatsApp has greatly improved patient compliance. Our follow-ups are much easier to track."
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ background: 'rgba(20,184,166,0.1)', color: '#14b8a6', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>DR</div>
                  <div style={{ textAlign: 'left' }}>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: 'white' }}>Dr. Ritu Verma</h4>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Pediatrician</span>
                  </div>
                </div>
              </div>
            </BorderGlow>
            <BorderGlow animated={false} fillOpacity={0.1}>
              <div className="pain-card" style={{ padding: '2rem' }}>
                <p style={{ fontStyle: 'italic', color: '#cbd5e1', fontSize: '15px', lineHeight: 1.7, marginBottom: '20px' }}>
                  "The billing logs and clinic performance metrics give me total visibility over my clinic metrics. I can audit the day's records in less than five minutes."
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ background: 'rgba(79,70,229,0.1)', color: '#4f46e5', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>DR</div>
                  <div style={{ textAlign: 'left' }}>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: 'white' }}>Dr. S. K. Nair</h4>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Cardiologist</span>
                  </div>
                </div>
              </div>
            </BorderGlow>
          </div>
        </div>
      </section>

      {/* ── PRICING SECTION ── */}
      <section className="section-v3" id="pricing">
        <div className="container center">
          <h2 className="section-title">Simple, Flat Pricing</h2>
          <p className="section-subtitle">Every plan includes our secure medical database and 14-day free trial.</p>
          
          <div className="pricing-grid-v5">
            <Link href="/auth?tab=register" className="price-card-link">
              <div className="price-card-v5 glass-card">
                <span className="p-tier">Solo Doctor</span>
                <div className="p-price">₹999<span>/mo</span></div>
                <ul className="p-features">
                  <li><Check size={14} className="text-wa"/> 1 Doctor Seat</li>
                  <li><Check size={14} className="text-wa"/> Digital Prescription Logs</li>
                  <li><Check size={14} className="text-wa"/> Patient Record History</li>
                  <li><Check size={14} className="text-wa"/> WhatsApp Trigger Links</li>
                </ul>
                <div className="btn-outline-wa w-full" style={{ textAlign: 'center', border: '1px solid rgba(59, 130, 246, 0.4)', color: '#3b82f6' }}>Start Free Trial</div>
              </div>
            </Link>

            <Link href="/auth?tab=register" className="price-card-link">
              <div className="price-card-v5 glass-card featured-wa" style={{ borderColor: '#3b82f6' }}>
                <div className="p-popular-wa" style={{ background: '#3b82f6', color: 'white' }}>POPULAR</div>
                <span className="p-tier" style={{ color: '#3b82f6' }}>Growing Clinic</span>
                <div className="p-price">₹2,999<span>/mo</span></div>
                <ul className="p-features">
                  <li><Check size={14} className="text-wa" style={{ color: '#3b82f6' }}/> Up to 5 Doctor Seats</li>
                  <li><Check size={14} className="text-wa" style={{ color: '#3b82f6' }}/> Invoices &amp; In-app Billing</li>
                  <li><Check size={14} className="text-wa" style={{ color: '#3b82f6' }}/> Real-time Queue Manager</li>
                  <li><Check size={14} className="text-wa" style={{ color: '#3b82f6' }}/> Patient Onboarding Logs</li>
                </ul>
                <div className="btn-premium w-full pulse-premium" style={{ textAlign: 'center', background: 'linear-gradient(90deg, #3b82f6 0%, #1e40af 100%)', boxShadow: '0 0 20px rgba(59, 130, 246, 0.4)' }}>Start Free Trial</div>
              </div>
            </Link>

            <Link href="/auth?tab=register" className="price-card-link">
              <div className="price-card-v5 glass-card">
                <div className="p-popular-wa" style={{ background: '#10b981', color: 'white' }}>BEST VALUE</div>
                <span className="p-tier">Enterprise</span>
                <div className="p-price">Custom</div>
                <ul className="p-features">
                  <li><Check size={14} className="text-wa"/> Unlimited Doctor Seats</li>
                  <li><Check size={14} className="text-wa"/> Custom API Integrations</li>
                  <li><Check size={14} className="text-wa"/> Multi-clinic Dashboards</li>
                  <li><Check size={14} className="text-wa"/> Dedicated Concierge Support</li>
                </ul>
                <div className="btn-outline-wa w-full" style={{ textAlign: 'center', border: '1px solid rgba(59, 130, 246, 0.4)', color: '#3b82f6' }}>Contact Sales</div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="final-cta-v5">
        <div className="container center">
          <h2>Ready to upgrade your <br/><span className="wa-green-text" style={{ color: '#3b82f6' }}>Clinical Workflows?</span></h2>
          <p style={{ margin: '1rem 0 2rem 0', opacity: 0.8 }}>Setup takes less than 5 minutes. Start your 14-day free trial now.</p>
          <Link href="/auth?tab=register" className="btn-premium pulse-premium shadow-wa" style={{ padding: "1.25rem 3rem", fontSize: "1.25rem", background: 'linear-gradient(90deg, #3b82f6 0%, #1e40af 100%)', boxShadow: '0 0 20px rgba(59, 130, 246, 0.4)' }}>Get Started Now</Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <PublicFooter />

      <style jsx>{`
        .landing-root { background: #080e14; color: #f8fafc; position: relative; overflow-x: hidden; font-family: 'Inter', -apple-system, sans-serif; }
        .grid-overlay { position: fixed; inset: 0; background-image: radial-gradient(rgba(59, 130, 246, 0.02) 1px, transparent 1px); background-size: 50px 50px; pointer-events: none; z-index: 1; }
        .bg-glow { position: fixed; width: 600px; height: 600px; background: radial-gradient(circle, rgba(59, 130, 246, 0.04) 0%, transparent 70%); border-radius: 50%; pointer-events: none; transform: translate(-50%, -50%); z-index: 0; filter: blur(80px); }
        
        .container { max-width: 1200px; margin: 0 auto; padding: 0 2rem; position: relative; z-index: 10; }
        .container.center { text-align: center; }

        .wa-green-text { color: #3b82f6; }
        .text-wa { color: #3b82f6; }

        /* Navbar */
        .glass-nav { position: fixed; top: 1rem; left: 50%; transform: translateX(-50%); width: 95%; max-width: 1200px; z-index: 1000; transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); padding: 0.8rem 2rem; border-radius: 100px; border: 1px solid rgba(255, 255, 255, 0.1); background: rgba(8, 14, 20, 0.85); backdrop-filter: blur(20px); box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5); }
        .glass-nav.scrolled { top: 0.5rem; background: rgba(8, 14, 20, 0.95); box-shadow: 0 15px 40px rgba(0, 0, 0, 0.6); }
        .nav-container { display: flex; justify-content: space-between; align-items: center; }
        .logo { display: flex; align-items: center; gap: 0.75rem; text-decoration: none; color: white; }
        .logo-text { font-weight: 800; font-size: 1.35rem; letter-spacing: -0.03em; }

        .nav-links { display: flex; gap: 2rem; align-items: center; }
        .nav-link-white { color: #94a3b8 !important; text-decoration: none !important; font-size: 0.9rem; font-weight: 600; transition: all 0.2s ease; }
        .nav-link-white:hover { color: #ffffff !important; }
        .nav-link-white.active { color: #ffffff !important; position: relative; }
        .nav-link-white.active::after { content: ''; position: absolute; bottom: -6px; left: 0; width: 100%; height: 2px; background: #3b82f6; border-radius: 2px; }

        .desktop-actions { display: flex; align-items: center; gap: 1rem; }
        .btn-login-secondary { background: rgba(59, 130, 246, 0.1); color: #3b82f6 !important; padding: 0.6rem 1.5rem; border-radius: 100px; font-weight: 700; font-size: 0.9rem; border: 1px solid rgba(59, 130, 246, 0.2); transition: all 0.3s ease; text-decoration: none; }
        .btn-login-secondary:hover { background: rgba(59, 130, 246, 0.2); border-color: rgba(59, 130, 246, 0.4); transform: translateY(-2px); }
        .btn-premium { background: linear-gradient(90deg, #3b82f6 0%, #1e40af 100%); color: white !important; padding: 0.6rem 1.5rem; border-radius: 100px; font-weight: 800; font-size: 0.95rem; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 0 20px rgba(59, 130, 246, 0.4); border: 1px solid rgba(255, 255, 255, 0.1); cursor: pointer; text-decoration: none; }
        .btn-premium:hover { transform: translateY(-2px); box-shadow: 0 0 30px rgba(59, 130, 246, 0.6); }

        .mobile-actions { display: none; align-items: center; gap: 10px; }
        .mobile-login-text { color: white !important; text-decoration: none !important; font-size: 0.95rem; font-weight: 600; transition: color 0.2s; }
        .mobile-login-text:hover { color: #3b82f6 !important; }

        .hamburger-btn { display: flex; flex-direction: column; gap: 5px; background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; cursor: pointer; padding: 8px 9px; }
        .hamburger-btn span { display: block; width: 20px; height: 2px; background: white; border-radius: 2px; transition: all 0.3s ease; }
        .hamburger-btn.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
        .hamburger-btn.open span:nth-child(2) { opacity: 0; transform: scaleX(0); }
        .hamburger-btn.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

        .mobile-menu { display: none; flex-direction: column; padding: 12px 20px 16px; border-top: 1px solid rgba(255, 255, 255, 0.07); background: rgba(8, 14, 20, 0.98); backdrop-filter: blur(20px); }
        .mobile-menu-link { display: block; padding: 14px 0; color: rgba(255, 255, 255, 0.8) !important; text-decoration: none !important; font-size: 1rem; font-weight: 600; border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
        .mobile-menu-link:hover { color: #3b82f6 !important; }
        .mobile-menu-divider { height: 1px; background: rgba(255, 255, 255, 0.08); margin: 8px 0; }
        .mobile-menu-login { display: block; padding: 13px 0; color: #3b82f6 !important; text-decoration: none !important; font-size: 1rem; font-weight: 700; }

        /* Hero */
        .hero-section { padding: 9rem 0 4rem; min-height: 90vh; display: flex; align-items: center; }
        .hero-grid { display: grid; grid-template-columns: 1fr 1.2fr; gap: 4rem; align-items: center; }
        .hero-content { max-width: 520px; text-align: left; display: flex; flex-direction: column; align-items: flex-start; }
        .wa-dot-container { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1.5rem; }
        .wa-dot { width: 8px; height: 8px; background: #3b82f6; border-radius: 50%; box-shadow: 0 0 12px #3b82f6; animation: pulse 2s infinite; }
        .wa-dot-container span { font-size: 0.75rem; font-weight: 800; color: #3b82f6; letter-spacing: 0.1em; }
        .hero-title { font-size: 3.8rem; font-weight: 900; line-height: 1.1; letter-spacing: -0.03em; margin-bottom: 1.5rem; color: #ffffff; }
        .hero-subtitle { color: #94a3b8; font-size: 1.2rem; line-height: 1.6; margin-bottom: 2rem; }
        
        .dedicated-hero-btns { display: flex; gap: 1rem; width: 100%; }
        .dedicated-btn { flex: 1; display: inline-flex; align-items: center; justify-content: center; text-decoration: none; border-radius: 12px; font-weight: 700; transition: all 0.3s; }
        .btn-hero-secondary { background: transparent; color: #ffffff !important; padding: 1.15rem 1.5rem; border: 1px solid rgba(255, 255, 255, 0.2); }
        .btn-hero-secondary:hover { background: rgba(255, 255, 255, 0.05); border-color: rgba(255, 255, 255, 0.4); transform: translateY(-2px); }

        .hero-visual { position: relative; display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%; }
        .wa-mockup-wrapper { width: 100%; max-width: 600px; z-index: 10; filter: drop-shadow(0 30px 60px rgba(0,0,0,0.6)); }
        
        .ticker-wrap { width: 100%; max-width: 550px; overflow: hidden; margin-top: 1.5rem; position: relative; mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent); -webkit-mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent); }
        .ticker-move { display: inline-flex; white-space: nowrap; animation: ticker-anim 25s linear infinite; gap: 1.5rem; color: #14b8a6; font-weight: 800; font-size: 1.2rem; letter-spacing: 0.05em; text-transform: uppercase; }
        @keyframes ticker-anim { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }

        .hero-stats { display: flex; align-items: center; justify-content: space-between; gap: 2rem; margin-top: 4rem; padding: 2.5rem 0; border-top: 1px solid rgba(255,255,255,0.05); width: 100%; }
        .stat-item { display: flex; align-items: center; gap: 1rem; text-align: left; }
        .stat-icon-circle { color: #3b82f6; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 50%; background: rgba(59, 130, 246, 0.1); }
        .stat-item strong { display: block; font-size: 1rem; font-weight: 800; color: #ffffff; }
        .stat-item span { color: #64748b; font-size: 0.8rem; }
        .stat-divider { width: 1px; height: 40px; background: rgba(255,255,255,0.05); }

        /* Problem Section */
        .section-v3 { padding: 6rem 0; }
        .section-title { font-size: 2.8rem; font-weight: 900; letter-spacing: -0.03em; margin-bottom: 1rem; color: #ffffff; }
        .section-subtitle { color: #64748b; font-size: 1.15rem; max-width: 600px; margin: 0 auto 3rem; }
        .pain-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem; }
        .pain-card { padding: 2.5rem; text-align: left; }
        .pain-icon { width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 1.5rem; }
        .pain-card h3 { font-size: 1.35rem; font-weight: 800; margin-bottom: 0.75rem; color: #ffffff; }
        .pain-card p { color: #94a3b8; line-height: 1.6; font-size: 0.95rem; }

        .wa-dark-bg { background: #060a0f; border-top: 1px solid rgba(255,255,255,0.05); border-bottom: 1px solid rgba(255,255,255,0.05); }

        /* Features */
        .feature-grid-v5 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem; }
        .feat-card-v5 { padding: 2.5rem; text-align: left; }
        .feat-card-v5 h3 { font-size: 1.35rem; font-weight: 800; color: #ffffff; }
        .feat-card-v5 p { color: #94a3b8; line-height: 1.6; font-size: 0.95rem; }

        /* How it works */
        .upgrade-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4rem; align-items: center; }
        .upgrade-visual { position: relative; width: 100%; border-radius: 20px; overflow: hidden; filter: drop-shadow(0 20px 40px rgba(0,0,0,0.5)); }
        .upgrade-content { text-align: left; }
        .upgrade-sub { color: #94a3b8; font-size: 1.1rem; margin-bottom: 2rem; }
        .step-list { display: flex; flex-direction: column; gap: 2rem; }
        .step-item { display: flex; gap: 1.5rem; align-items: flex-start; }
        .step-num-wa { font-size: 1.8rem; font-weight: 900; color: rgba(59, 130, 246, 0.2); line-height: 1; }
        .step-info h3 { font-size: 1.25rem; font-weight: 800; margin-bottom: 0.5rem; color: #ffffff; }
        .step-info p { color: #94a3b8; line-height: 1.5; font-size: 0.95rem; }

        /* Pricing */
        .pricing-grid-v5 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem; margin-top: 3rem; }
        .price-card-v5 { padding: 3rem 2rem; text-align: left; position: relative; background: rgba(255,255,255,0.02); border-radius: 24px; border: 1px solid rgba(255,255,255,0.05); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); height: 100%; display: flex; flex-direction: column; }
        .price-card-v5:hover { background: rgba(255,255,255,0.04); border-color: rgba(59, 130, 246, 0.3); transform: translateY(-8px); box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
        .price-card-link { text-decoration: none !important; color: inherit !important; display: block; }
        
        .p-tier { font-size: 0.8rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 1rem; display: block; }
        .p-price { font-size: 3rem; font-weight: 900; margin-bottom: 2rem; color: #ffffff; }
        .p-price span { font-size: 1rem; color: #475569; }
        .p-features { list-style: none; padding: 0; margin: 0 0 2.5rem; display: flex; flex-direction: column; gap: 1rem; flex-grow: 1; }
        .p-features li { display: flex; align-items: center; gap: 0.75rem; font-weight: 600; color: #cbd5e1; font-size: 0.9rem; }
        
        .featured-wa { border-color: #3b82f6 !important; background: rgba(59, 130, 246, 0.03); }
        .p-popular-wa { position: absolute; top: -14px; left: 50%; transform: translateX(-50%); background: #3b82f6; color: white; font-size: 0.75rem; font-weight: 900; padding: 0.45rem 1.5rem; border-radius: 100px; white-space: nowrap; z-index: 20; box-shadow: 0 4px 12px rgba(0,0,0,0.3); }

        .final-cta-v5 { padding: 8rem 0; background: radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.05) 0%, transparent 60%); }
        .final-cta-v5 h2 { font-size: 3.5rem; font-weight: 900; letter-spacing: -0.03em; line-height: 1.1; margin-bottom: 1.5rem; color: #ffffff; }

        @keyframes pulse { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.4); opacity: 0.4; } 100% { transform: scale(1); opacity: 1; } }

        /* Global style for footer override styling */
        :global(.footer-v5) { padding: 5rem 0 3rem; border-top: 1px solid rgba(255,255,255,0.05); background: #060a0f; }
        :global(.footer-top) { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4rem; gap: 4rem; }
        :global(.footer-info) { max-width: 350px; text-align: left; }
        :global(.footer-info p) { color: #64748b; font-size: 0.9rem; lineHeight: 1.6; margin-top: 1rem; }
        :global(.footer-logo-text) { font-weight: 800; font-size: 1.25rem; color: white; margin-left: 8px; }
        :global(.footer-links-column) { display: flex; flex-direction: column; gap: 0.85rem; text-align: left; }
        :global(.footer-links-column h4) { font-size: 0.85rem; font-weight: 800; color: white; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.5rem; }
        :global(.footer-links-column a) { color: #64748b; text-decoration: none; font-size: 0.9rem; transition: color 0.2s; }
        :global(.footer-links-column a:hover) { color: #3b82f6; }
        :global(.footer-bottom) { border-top: 1px solid rgba(255,255,255,0.03); padding-top: 2.5rem; display: flex; justify-content: space-between; align-items: center; }
        :global(.footer-bottom p) { font-size: 0.8rem; color: #475569; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; }

        @media (max-width: 1024px) {
          .hero-grid { grid-template-columns: 1fr; gap: 3rem; }
          .hero-content { text-align: center; align-items: center; max-width: 100%; }
          .hero-subtitle { text-align: center; }
          .dedicated-hero-btns { justify-content: center; max-width: 480px; }
          .upgrade-grid { grid-template-columns: 1fr; gap: 3rem; }
          .pain-grid { grid-template-columns: 1fr 1fr; }
          .feature-grid-v5 { grid-template-columns: 1fr 1fr; }
          .pricing-grid-v5 { grid-template-columns: 1fr; max-width: 450px; margin: 3rem auto 0; }
          .nav-links { display: none; }
          .hero-stats { flex-direction: column; gap: 1.5rem; align-items: flex-start; }
          .stat-divider { display: none; }
        }

        @media (max-width: 768px) {
          .glass-nav { padding: 0.6rem 1.25rem; width: 92%; }
          .mobile-actions { display: flex; }
          .desktop-actions { display: none; }
          .mobile-menu { display: flex; }
          .hero-section { padding: 7rem 0 3rem; }
          .hero-title { font-size: 2.5rem; text-align: center; }
          .section-title { font-size: 2rem; }
          .final-cta-v5 h2 { font-size: 2rem; }
          .pain-grid { grid-template-columns: 1fr; }
          .feature-grid-v5 { grid-template-columns: 1fr; }
          :global(.footer-top) { flex-direction: column; gap: 2.5rem; }
          :global(.footer-bottom) { flex-direction: column; gap: 1rem; }
        }
      `}</style>
    </div>
  );
}
