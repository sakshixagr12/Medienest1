"use client";

import { useState } from "react";
import "./RecruiterPresentation.css";

interface RecruiterPresentationProps {
  onClose: () => void;
}

export default function RecruiterPresentation({ onClose }: RecruiterPresentationProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const totalSlides = 3;

  const handleNext = () => {
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const bannerImg = "https://media.licdn.com/dms/image/v2/D5616AQHsANjy9EDK6A/profile-displaybackgroundimage-shrink_200_800/B56ZrmNOCJHQAU-/0/1764798817271?e=1782950400&v=beta&t=Xf2ugZdlMw12zxlWAUYUHjXM5POACdJ4nUbDxc2wKYs";
  const avatarImg = "https://media.licdn.com/dms/image/v2/D5603AQEkCzr67nSe8g/profile-displayphoto-crop_800_800/B56ZohwqE7I8AI-/0/1761502997216?e=1782950400&v=beta&t=a0-CQr-QQHbriyW9al_uyqm51mgYd_2Jmve8s95BF1o";

  return (
    <div className="presentation-overlay" onClick={onClose}>
      <div className="presentation-container" onClick={(e) => e.stopPropagation()}>
        {/* Dismiss Button */}
        <button className="pres-close-btn" onClick={onClose} title="Close Presentation">
          ✕
        </button>

        {/* Dynamic Headers */}
        <div className="pres-header">
          {currentSlide === 0 && (
            <>
              <h3>Project Overview</h3>
              <h2>MedieNest at a Glance</h2>
            </>
          )}
          {currentSlide === 1 && (
            <>
              <h3>Technical Competence</h3>
              <h2>Technology & Skills Demonstrated</h2>
            </>
          )}
          {currentSlide === 2 && (
            <>
              <h3>Get In Touch</h3>
              <h2>Contact & Project Links</h2>
            </>
          )}
        </div>

        {/* Slide Body */}
        <div className="slide-body">
          {/* SLIDE 0: MedieNest at a Glance */}
          {currentSlide === 0 && (
            <div className="stats-grid">
              <div className="stat-card hero-stat-card">
                <div className="stat-icon">⚡</div>
                <div className="stat-info">
                  <h4>Built End-to-End by One Developer</h4>
                  <p>Designed, developed, secured, and deployed entirely by Utkarsh Shukla.</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">📦</div>
                <div className="stat-info">
                  <h4>40+ DB Migrations</h4>
                  <p>Robust database schema evolution in PostgreSQL.</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">🏢</div>
                <div className="stat-info">
                  <h4>Multi-Clinic SaaS</h4>
                  <p>Flexible multi-tenant architecture with data isolation.</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">📁</div>
                <div className="stat-info">
                  <h4>EHR & Admissions</h4>
                  <p>Electronic Health Records & active patient management.</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">💊</div>
                <div className="stat-info">
                  <h4>Smart Prescriptions</h4>
                  <p>Digital Rx builder with AI recommendations.</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">🤖</div>
                <div className="stat-info">
                  <h4>Clinical AI Assistant</h4>
                  <p>Smart Patient Guidance sheets & audio voiceovers.</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">🔒</div>
                <div className="stat-info">
                  <h4>Role-Based Security</h4>
                  <p>Secure Row Level Security (RLS) data protection.</p>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 1: Technology & Skills Demonstrated */}
          {currentSlide === 1 && (
            <div className="skills-grid">
              <div className="skill-card">
                <div className="skill-badge">Frontend</div>
                <h4>React, Next.js, TS</h4>
                <p>Designed interactive guides, real-time flows, and glassmorphic layouts.</p>
              </div>

              <div className="skill-card">
                <div className="skill-badge">Backend</div>
                <h4>API & Server Actions</h4>
                <p>Created secure Next.js Server Actions, APIs, and business-logic validation.</p>
              </div>

              <div className="skill-card">
                <div className="skill-badge">Database</div>
                <h4>PostgreSQL & Supabase</h4>
                <p>Designed clean schemas, relational structures, and search triggers.</p>
              </div>

              <div className="skill-card">
                <div className="skill-badge">Security</div>
                <h4>RBAC & RLS Hardening</h4>
                <p>Enforced multi-clinic isolation and role-based policies directly in DB.</p>
              </div>

              <div className="skill-card">
                <div className="skill-badge">AI</div>
                <h4>Clinical Assistance</h4>
                <p>Implemented medical prompt engineering for summary and guidance sheets.</p>
              </div>

              <div className="skill-card">
                <div className="skill-badge">SaaS</div>
                <h4>Multi-Clinic Core</h4>
                <p>Architected multi-tenant subscriptions, staff rosters, and patient queue metrics.</p>
              </div>
            </div>
          )}

          {/* SLIDE 2: Contact Details */}
          {currentSlide === 2 && (
            <div className="profile-card">
              {/* LinkedIn Style Profile Header */}
              <div className="profile-banner" style={{ backgroundImage: `url(${bannerImg})` }}></div>
              <div className="profile-avatar-wrapper">
                <div className="profile-avatar">
                  <img src={avatarImg} alt="Utkarsh Shukla" />
                </div>
                <div className="profile-quick-links">
                  <a href="https://github.com/thisarsh" target="_blank" rel="noopener noreferrer" className="profile-btn-link github">
                    💻 GitHub
                  </a>
                  <a href="https://www.linkedin.com/in/utkarsh-shukla-66825a31a/" target="_blank" rel="noopener noreferrer" className="profile-btn-link linkedin">
                    🔗 LinkedIn
                  </a>
                </div>
              </div>

              <div className="profile-info">
                <h3>Utkarsh Shukla</h3>
                <div className="subtitle">B.Tech CSE-AI | Full Stack Developer</div>
                
                <div className="profile-details-grid">
                  <div className="detail-item">
                    <div className="detail-item-icon">📧</div>
                    <span>
                      Email: <a href="mailto:utkarsh.shukla.ind@gmail.com">utkarsh.shukla.ind@gmail.com</a>
                    </span>
                  </div>

                  <div className="detail-item">
                    <div className="detail-item-icon">📱</div>
                    <span>Phone: <b>+91 7380520394</b></span>
                  </div>

                  <div className="detail-item">
                    <div className="detail-item-icon">📍</div>
                    <span>Location: <b>India</b></span>
                  </div>

                  <div className="detail-item">
                    <div className="detail-item-icon">🚀</div>
                    <span>Status: <b>Open to Opportunities</b></span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Bar */}
        <div className="pres-nav-bar">
          <div className="pres-dots">
            {Array.from({ length: totalSlides }).map((_, idx) => (
              <button
                key={idx}
                className={`pres-dot ${idx === currentSlide ? "active" : ""}`}
                onClick={() => setCurrentSlide(idx)}
              />
            ))}
          </div>

          <div className="pres-nav-actions">
            <button
              className="pres-btn-nav prev"
              onClick={handlePrev}
              disabled={currentSlide === 0}
            >
              ← Back
            </button>
            {currentSlide < totalSlides - 1 ? (
              <button className="pres-btn-nav next" onClick={handleNext}>
                Next Step →
              </button>
            ) : (
              <button className="pres-btn-nav finish" onClick={onClose}>
                Finish Walkthrough 🎉
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
