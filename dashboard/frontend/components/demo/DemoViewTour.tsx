"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import "../DemoTourOverlay.css";
import "./DemoPrescriptionTour.css";

interface TourStep {
  selector: string;
  tab: "Patient Profile" | "Current Script" | "Care Guidance" | "Patient History";
  title: string;
  description: string;
  placement: "bottom" | "top" | "left" | "right";
  accent: string;
  icon: string;
}

interface DemoViewTourProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
}

const TOUR_STEPS: TourStep[] = [
  {
    selector: "[data-tour='view-tab-patient-profile']",
    tab: "Patient Profile",
    title: "Patient Demographics & Vitals",
    description: "The Patient Profile houses verified demographic and key biometric info, including key clinical conditions parsed by AI.",
    placement: "bottom",
    accent: "#0ea5e9",
    icon: "👤"
  },
  {
    selector: "[data-tour='view-tab-current-script']",
    tab: "Current Script",
    title: "Digital Clinical Prescription",
    description: "The official clinical record containing Chief Complaints, clinical findings, official Diagnosis, and prescribed medicines.",
    placement: "bottom",
    accent: "#0d6e56",
    icon: "📄"
  },
  {
    selector: "[data-tour='view-tab-care-guidance']",
    tab: "Care Guidance",
    title: "AI Patient Guidance Sheet",
    description: "This view shows the AI-generated and doctor-approved patient care instructions (diet, activity, avoid list, warning signs) in clean cards.",
    placement: "bottom",
    accent: "#10b981",
    icon: "🛡️"
  },
  {
    selector: "[data-tour='view-tab-patient-history']",
    tab: "Patient History",
    title: "Electronic Health Records (EHR)",
    description: "A chronological timeline of the patient's past consultations, diagnoses, and treatments, allowing the patient to track their recovery.",
    placement: "bottom",
    accent: "#f59e0b",
    icon: "⏳"
  }
];

export default function DemoViewTour({ activeTab, setActiveTab }: DemoViewTourProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const [arrowStyle, setArrowStyle] = useState<React.CSSProperties>({});
  const [isTransitioning, setIsTransitioning] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const step = TOUR_STEPS[currentStep];

  const positionSpotlight = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(step.selector);
    if (!el) return;

    const rect = el.getBoundingClientRect();
    setSpotlightRect(rect);

    const pad = 12;
    const tooltipW = 380;
    const tooltipH = 220;
    let top = 0;
    let left = 0;

    switch (step.placement) {
      case "bottom":
        top = rect.bottom + pad + 12;
        left = rect.left + rect.width / 2 - tooltipW / 2;
        break;
      case "top":
        top = rect.top - tooltipH - pad - 12;
        left = rect.left + rect.width / 2 - tooltipW / 2;
        break;
      case "left":
        top = rect.top + rect.height / 2 - tooltipH / 2;
        left = rect.left - tooltipW - pad;
        break;
      case "right":
        top = rect.top + rect.height / 2 - tooltipH / 2;
        left = rect.right + pad;
        break;
    }

    left = Math.max(16, Math.min(left, window.innerWidth - tooltipW - 16));
    top = Math.max(16, Math.min(top, window.innerHeight - tooltipH - 16));

    setTooltipStyle({
      top: `${top}px`,
      left: `${left}px`,
      "--tour-accent": step.accent,
    } as React.CSSProperties);

    const elCenterX = rect.left + rect.width / 2;
    let arrowTop = 0;
    let arrowLeft = 0;

    switch (step.placement) {
      case "bottom":
        arrowLeft = elCenterX;
        arrowTop = rect.bottom + 4;
        break;
      case "top":
        arrowLeft = elCenterX;
        arrowTop = rect.top - 28;
        break;
      case "left":
        arrowLeft = rect.left - 28;
        arrowTop = rect.top + rect.height / 2;
        break;
      case "right":
        arrowLeft = rect.right + 4;
        arrowTop = rect.top + rect.height / 2;
        break;
    }

    setArrowStyle({
      top: `${arrowTop}px`,
      left: `${arrowLeft}px`,
    });
  }, [step]);

  // Initial trigger to open the first tab and start tour
  useEffect(() => {
    if (dismissed) return;
    
    // Set first tab active immediately
    setActiveTab(TOUR_STEPS[0].tab);
    
    const timer = setTimeout(() => {
      // Scroll the tab row/first button into view smoothly
      const el = document.querySelector(TOUR_STEPS[0].selector);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      setVisible(true);
    }, 800);
    
    return () => clearTimeout(timer);
  }, [dismissed, setActiveTab]);

  useEffect(() => {
    if (!visible) return;
    const handler = () => positionSpotlight();
    window.addEventListener("resize", handler);
    window.addEventListener("scroll", handler, true);
    return () => {
      window.removeEventListener("resize", handler);
      window.removeEventListener("scroll", handler, true);
    };
  }, [visible, positionSpotlight]);

  useEffect(() => {
    if (!visible) return;
    
    positionSpotlight();
    const timer = setTimeout(() => {
      setIsTransitioning(false);
    }, 100);
    return () => clearTimeout(timer);
  }, [currentStep, visible, step, positionSpotlight]);

  const goToStep = (idx: number) => {
    setIsTransitioning(true);
    const nextStep = TOUR_STEPS[idx];
    if (nextStep) {
      // Update parent tab state immediately so it renders new content
      setActiveTab(nextStep.tab);
      
      // Wait a tick for tab content to mount, then scroll tab selector into view
      setTimeout(() => {
        const el = document.querySelector(nextStep.selector);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    }

    // Wait exactly 2.5 seconds for tab contents to render and user to view them before displaying tooltip
    setTimeout(() => {
      setCurrentStep(idx);
    }, 2500);
  };

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      goToStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      goToStep(currentStep - 1);
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(() => setDismissed(true), 400);
  };

  const handleFinishTour = () => {
    setVisible(false);
    setDismissed(true);
    // Redirect recruiter back to portal landing with presentation trigger query param
    router.push("/demo/portal?showPresentation=true");
  };

  if (dismissed || !visible) return null;

  const spotPad = 6;
  const isLastStep = currentStep === TOUR_STEPS.length - 1;

  return (
    <div className="demo-tour-overlay" ref={overlayRef}>
      {spotlightRect && (
        <svg
          className={`demo-tour-svg ${isTransitioning ? "transitioning" : ""}`}
          width="100%"
          height="100%"
          style={{ position: "fixed", top: 0, left: 0, zIndex: 10000 }}
        >
          <defs>
            <mask id="view-tour-spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              <rect
                x={spotlightRect.left - spotPad}
                y={spotlightRect.top - spotPad}
                width={spotlightRect.width + spotPad * 2}
                height={spotlightRect.height + spotPad * 2}
                rx="30"
                ry="30"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.55)"
            mask="url(#view-tour-spotlight-mask)"
          />
          {/* Spotlight Border Ring */}
          <rect
            className="tour-spotlight-ring"
            x={spotlightRect.left - spotPad}
            y={spotlightRect.top - spotPad}
            width={spotlightRect.width + spotPad * 2}
            height={spotlightRect.height + spotPad * 2}
            rx="30"
            ry="30"
            fill="none"
            stroke={step.accent}
            strokeWidth="2.5"
            style={{ "--tour-accent": step.accent } as React.CSSProperties}
          />
        </svg>
      )}

      {spotlightRect && (
        <div
          className={`tour-arrow tour-arrow-${step.placement} ${isTransitioning ? "transitioning" : ""}`}
          style={{
            ...arrowStyle,
            color: step.accent,
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z" />
          </svg>
        </div>
      )}

      <div
        className={`tour-tooltip ${isTransitioning ? "transitioning" : ""}`}
        style={tooltipStyle}
      >
        <div className="tour-tooltip-header">
          <span className="tour-tooltip-icon">{step.icon}</span>
          <div>
            <h4 className="tour-tooltip-title">{step.title}</h4>
            <span
              className="tour-tooltip-step-badge"
              style={{ background: `${step.accent}20`, color: step.accent }}
            >
              Step {currentStep + 1} of {TOUR_STEPS.length}
            </span>
          </div>
          <button className="tour-close-btn" onClick={handleDismiss} title="Dismiss Tour">
            ✕
          </button>
        </div>

        <p className="tour-tooltip-desc">{step.description}</p>

        <div className="tour-progress-dots">
          {TOUR_STEPS.map((_, idx) => (
            <button
              key={idx}
              className={`tour-dot ${idx === currentStep ? "active" : ""}`}
              style={{
                background: idx === currentStep ? step.accent : undefined,
              }}
              onClick={() => goToStep(idx)}
            />
          ))}
        </div>

        <div className="tour-tooltip-actions" style={{ justifyContent: "space-between" }}>
          <button
            className="tour-btn-ghost"
            onClick={handlePrev}
            disabled={currentStep === 0}
            style={{ visibility: currentStep === 0 ? "hidden" : "visible" }}
          >
            ← Back
          </button>
          {isLastStep ? (
            <button
              className="tour-btn-primary rx-tour-cta-pulse-green"
              style={{ background: "#10b981" }}
              onClick={handleFinishTour}
            >
              See Project Summary 🚀
            </button>
          ) : (
            <button
              className="tour-btn-primary"
              style={{ background: step.accent }}
              onClick={handleNext}
            >
              Next Tab →
            </button>
          )}
        </div>

        <button className="tour-skip-link" onClick={handleDismiss}>
          Skip guided walkthrough
        </button>
      </div>
    </div>
  );
}
