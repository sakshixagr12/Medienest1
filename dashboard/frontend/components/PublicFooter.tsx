import Link from "next/link";
import Image from "next/image";

export default function PublicFooter() {
  return (
    <footer className="footer-v5">
      <div className="container">
        <div className="footer-top">
          <div className="footer-info">
            <Link href="/" className="logo">
              <Image
                src="/assets/medienest_logo.png"
                alt="MedieNest"
                width={32}
                height={32}
                className="footer-logo-img"
              />
              <span className="footer-logo-text">MedieNest</span>
            </Link>
            <p>
              Automating clinical workflows and digital prescriptions with the power of advanced AI. Built to streamline operations for modern practitioners.
            </p>
          </div>
          
          <div className="footer-links-column">
            <h4>Product</h4>
            <Link href="/features">Features</Link>
            <Link href="/use-cases">Use Cases</Link>
            <Link href="/how-it-works">How It Works</Link>
            <Link href="/pricing">Pricing</Link>
          </div>

          <div className="footer-links-column">
            <h4>Legal &amp; Policy</h4>
            <Link href="/about">About Us</Link>
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Service</Link>
          </div>

          <div className="footer-links-column">
            <h4>Connect &amp; Support</h4>
            <Link href="/support">Support Center</Link>
            <a href="mailto:utkarsh.shukla.ind@gmail.com">utkarsh.shukla.ind@gmail.com</a>
          </div>
        </div>

        <div className="footer-bottom" style={{ flexDirection: 'column', gap: '1rem', textAlign: 'center' }}>
          <p className="disclaimer-text" style={{ fontSize: '13px', color: '#64748b', textTransform: 'none', fontWeight: 'normal', margin: '0 0 10px 0', lineHeight: 1.5, letterSpacing: 'normal' }}>
            MedieNest provides healthcare workflow software. Clinical decisions remain the responsibility of licensed healthcare professionals.
          </p>
          <p style={{ margin: 0 }}>© 2026 MEDIENEST CARE • INTELLIGENT CLINIC SOLUTIONS</p>
        </div>
      </div>
    </footer>
  );
}
