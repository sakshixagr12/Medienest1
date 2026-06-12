"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import "../DemoTourOverlay.css";
import "./DemoDashboardTour.css";

interface TourStep {
  selector: string;
  title: string;
  description: string;
  placement: "bottom" | "top" | "left" | "right";
  accent: string;
  icon: string;
  ctaLabel?: string;
  scrollIntoView?: boolean;
  navigateTo?: string;
  navigateLabel?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    selector: "[data-tour='dashboard-header']",
    title: "Doctor Dashboard",
    description:
      "This is your command center. It shows a personalized greeting with how many patients you've seen today. Everything updates in real-time.",
    placement: "bottom",
    accent: "#2e7d32",
    icon: "👋",
  },
  {
    selector: "[data-tour='metrics-row']",
    title: "Live Metrics",
    description:
      "At a glance — see patients seen today, how many are still waiting, and your prescription census for today, this week, and this month.",
    placement: "bottom",
    accent: "#8b5cf6",
    icon: "📊",
  },
  {
    selector: "[data-tour='active-queue']",
    title: "Live Waiting Queue",
    description:
      "This is the real-time patient queue. The first patient is automatically called for consultation. You can see who's being served now and who's waiting next — with estimated wait times.",
    placement: "top",
    accent: "#ef4444",
    icon: "🔴",
    scrollIntoView: true,
  },
  {
    selector: "[data-tour='waiting-list']",
    title: "Waiting Patients",
    description:
      "These patients are next in line. Each shows estimated wait time, and you can view their profile or start writing a prescription directly from here.",
    placement: "top",
    accent: "#f59e0b",
    icon: "⏳",
    scrollIntoView: true,
  },
  {
    selector: "[data-tour='clinical-intelligence']",
    title: "Clinical Intelligence",
    description:
      "Analytics at your fingertips — active queue breakdown (emergency vs general), average consultation time, and patient census across today, week, and month.",
    placement: "top",
    accent: "#0ea5e9",
    icon: "🧠",
    scrollIntoView: true,
  },
  {
    selector: "[data-tour='now-serving']",
    title: "Write a Prescription",
    description:
      "This patient is currently being served. Click on their name to open the Digital Prescription page — generate a full prescription with medications, dosage, and notes. Try it now!",
    placement: "top",
    accent: "#10b981",
    icon: "✍️",
    ctaLabel: "Click the patient's name, or use the button below",
    scrollIntoView: true,
    navigateTo:
      "/demo/portal/digital-prescription?patientId=p-rahul&doctorName=Gopal Shukla&ptName=Rahul%20Verma&ptPhone=%2B91%2098765%2043210&ptAge=34&ptSex=Male&ptBloodGroup=O%2B&doctorId=demo-doc-gopal",
    navigateLabel: "Write Prescription",
  },
];

export default function DemoDashboardTour() {
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

    const pad = 18;
    const tooltipW = 380;
    const tooltipH = 260;
    let top = 0,
      left = 0;

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
    let arrowTop = 0,
      arrowLeft = 0;

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

  useEffect(() => {
    if (dismissed) return;
    const timer = setTimeout(() => {
      setVisible(true);
      positionSpotlight();
    }, 1200);
    return () => clearTimeout(timer);
  }, [dismissed, positionSpotlight]);

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

    if (step?.scrollIntoView) {
      const el = document.querySelector(step.selector);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => {
          positionSpotlight();
          setIsTransitioning(false);
        }, 500);
        return;
      }
    }

    positionSpotlight();
    setIsTransitioning(false);
  }, [currentStep, visible, step, positionSpotlight]);

  const goToStep = (idx: number) => {
    setIsTransitioning(true);
    setCurrentStep(idx);
  };

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) goToStep(currentStep + 1);
  };

  const handlePrev = () => {
    if (currentStep > 0) goToStep(currentStep - 1);
  };

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(() => setDismissed(true), 400);
  };

  const handleNavigate = () => {
    if (step.navigateTo) {
      setVisible(false);
      setDismissed(true);
      router.push(step.navigateTo);
    }
  };

  if (dismissed || !visible) return null;

  const spotPad = 10;
  const isLastStep = currentStep === TOUR_STEPS.length - 1;

  return (
    <div className="demo-tour-overlay" ref={overlayRef}>
      {spotlightRect && (
        <svg
          className="demo-tour-svg"
          width="100%"
          height="100%"
          style={{ position: "fixed", top: 0, left: 0, zIndex: 10000 }}
        >
          <defs>
            <mask id="dash-tour-spotlight-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={spotlightRect.left - spotPad}
                y={spotlightRect.top - spotPad}
                width={spotlightRect.width + spotPad * 2}
                height={spotlightRect.height + spotPad * 2}
                rx="16"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.58)"
            mask="url(#dash-tour-spotlight-mask)"
            onClick={handleDismiss}
          />
          <rect
            className="tour-spotlight-ring"
            x={spotlightRect.left - spotPad}
            y={spotlightRect.top - spotPad}
            width={spotlightRect.width + spotPad * 2}
            height={spotlightRect.height + spotPad * 2}
            rx="16"
            fill="none"
            stroke={step.accent}
            strokeWidth="2.5"
          />
        </svg>
      )}

      <div
        className={`tour-arrow tour-arrow-${step.placement}`}
        style={arrowStyle}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke={step.accent}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {step.placement === "bottom" && (
            <path d="M12 5v14M19 12l-7 7-7-7" />
          )}
          {step.placement === "top" && (
            <path d="M12 19V5M5 12l7-7 7 7" />
          )}
          {step.placement === "left" && (
            <path d="M19 12H5M12 5l-7 7 7 7" />
          )}
          {step.placement === "right" && (
            <path d="M5 12h14M12 5l7 7-7 7" />
          )}
        </svg>
      </div>

      <div
        className={`tour-tooltip ${isTransitioning ? "transitioning" : ""}`}
        style={tooltipStyle}
        key={currentStep}
      >
        <div className="tour-tooltip-header">
          <span className="tour-tooltip-icon">{step.icon}</span>
          <div>
            <h3 className="tour-tooltip-title">{step.title}</h3>
            <span
              className="tour-tooltip-step-badge"
              style={{ background: `${step.accent}18`, color: step.accent }}
            >
              Step {currentStep + 1} of {TOUR_STEPS.length}
            </span>
          </div>
          <button className="tour-close-btn" onClick={handleDismiss}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <p className="tour-tooltip-desc">{step.description}</p>

        {step.ctaLabel && (
          <div className="dash-tour-cta-callout">
            <span className="dash-tour-cta-pulse" />
            <span className="dash-tour-cta-text">{step.ctaLabel}</span>
          </div>
        )}

        <div className="tour-progress-dots">
          {TOUR_STEPS.map((_, i) => (
            <button
              key={i}
              className={`tour-dot ${i === currentStep ? "active" : ""}`}
              style={
                i === currentStep ? { background: step.accent } : undefined
              }
              onClick={() => goToStep(i)}
            />
          ))}
        </div>

        <div className="tour-tooltip-actions">
          <div className="tour-nav-btns">
            {currentStep > 0 && (
              <button className="tour-btn-ghost" onClick={handlePrev}>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Back
              </button>
            )}
            {!isLastStep && (
              <button className="tour-btn-ghost" onClick={handleNext}>
                Next
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>

          {isLastStep && step.navigateTo && (
            <button
              className="tour-btn-primary dash-tour-rx-btn"
              style={{ background: step.accent }}
              onClick={handleNavigate}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              <span>{step.navigateLabel || "Go"}</span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>

        <button className="tour-skip-link" onClick={handleDismiss}>
          Skip tour — I&apos;ll explore myself
        </button>
      </div>
    </div>
  );
}
