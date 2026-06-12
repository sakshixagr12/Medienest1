"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import "./DemoTourOverlay.css";

interface TourStep {
  /** CSS selector to highlight */
  selector: string;
  /** Title shown in the tooltip */
  title: string;
  /** Description text */
  description: string;
  /** Where to place tooltip relative to the element */
  placement: "bottom" | "top" | "left" | "right";
  /** Accent colour for the step */
  accent: string;
  /** Icon emoji */
  icon: string;
  /** If set, clicking "Let's Go" navigates here */
  navigateTo?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    selector: "[data-tour='doctor-dashboard']",
    title: "Doctor Dashboard",
    description:
      "Start here — view patient queue, write prescriptions, and manage consultations in real-time.",
    placement: "bottom",
    accent: "#2e7d32",
    icon: "🩺",
    navigateTo: "/demo/portal/doctor-dashboard",
  },
  {
    selector: "[data-tour='front-desk']",
    title: "Front Desk",
    description:
      "Manage patient check-ins, queue flow, and appointments seamlessly.",
    placement: "bottom",
    accent: "#7c3aed",
    icon: "📋",
    navigateTo: "/demo/portal/front-desk",
  },
  {
    selector: "[data-tour='billing']",
    title: "Billing & Payments",
    description:
      "Generate receipts, track payments, and monitor clinic revenue at a glance.",
    placement: "top",
    accent: "#0d9488",
    icon: "💳",
    navigateTo: "/demo/portal/billing-receipts",
  },
  {
    selector: "[data-tour='settings']",
    title: "Clinic Settings",
    description:
      "Configure clinic details, add doctors, and manage system preferences.",
    placement: "top",
    accent: "#4f46e5",
    icon: "⚙️",
    navigateTo: "/demo/portal/clinic-settings",
  },
];

export default function DemoTourOverlay() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const [arrowStyle, setArrowStyle] = useState<React.CSSProperties>({});
  const overlayRef = useRef<HTMLDivElement>(null);

  const step = TOUR_STEPS[currentStep];

  const positionSpotlight = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(step.selector);
    if (!el) return;

    const rect = el.getBoundingClientRect();
    setSpotlightRect(rect);

    // Calculate tooltip position
    const pad = 18;
    let top = 0,
      left = 0;
    const tooltipW = 360;
    const tooltipH = 200;

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

    // Clamp to viewport
    left = Math.max(16, Math.min(left, window.innerWidth - tooltipW - 16));
    top = Math.max(16, Math.min(top, window.innerHeight - tooltipH - 16));

    setTooltipStyle({
      top: `${top}px`,
      left: `${left}px`,
      "--tour-accent": step.accent,
    } as React.CSSProperties);

    // Arrow from tooltip to element
    const elCenterX = rect.left + rect.width / 2;
    const elCenterY = rect.top + rect.height / 2;
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
        arrowTop = elCenterY;
        break;
      case "right":
        arrowLeft = rect.right + 4;
        arrowTop = elCenterY;
        break;
    }

    setArrowStyle({
      top: `${arrowTop}px`,
      left: `${arrowLeft}px`,
    });
  }, [step]);

  // Show after a brief delay
  useEffect(() => {
    if (dismissed) return;
    const timer = setTimeout(() => {
      setVisible(true);
      positionSpotlight();
    }, 800);
    return () => clearTimeout(timer);
  }, [dismissed, positionSpotlight]);

  // Reposition on scroll / resize
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

  // Reposition when step changes
  useEffect(() => {
    if (visible) {
      positionSpotlight();
    }
  }, [currentStep, visible, positionSpotlight]);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(() => setDismissed(true), 400);
  };

  const handleNavigate = () => {
    if (step.navigateTo) {
      setVisible(false);
      // For Doctor Dashboard, auto-select the demo doctor
      if (step.navigateTo.includes("doctor-dashboard")) {
        router.push(
          `${step.navigateTo}?doctorId=demo-doc-gopal&doctorName=${encodeURIComponent("Gopal Shukla")}`
        );
      } else {
        router.push(step.navigateTo);
      }
    }
  };

  if (dismissed || !visible) return null;

  const spotPad = 10;

  return (
    <div className="demo-tour-overlay" ref={overlayRef}>
      {/* Dark overlay with spotlight cutout */}
      {spotlightRect && (
        <svg
          className="demo-tour-svg"
          width="100%"
          height="100%"
          style={{ position: "fixed", top: 0, left: 0, zIndex: 10000 }}
        >
          <defs>
            <mask id="tour-spotlight-mask">
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
            fill="rgba(0,0,0,0.62)"
            mask="url(#tour-spotlight-mask)"
            onClick={handleDismiss}
          />
          {/* Animated outline around spotlight */}
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

      {/* Animated bouncing arrow */}
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

      {/* Tooltip card */}
      <div className="tour-tooltip" style={tooltipStyle}>
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

        {/* Progress dots */}
        <div className="tour-progress-dots">
          {TOUR_STEPS.map((_, i) => (
            <button
              key={i}
              className={`tour-dot ${i === currentStep ? "active" : ""}`}
              style={
                i === currentStep ? { background: step.accent } : undefined
              }
              onClick={() => setCurrentStep(i)}
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
            {currentStep < TOUR_STEPS.length - 1 && (
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

          <button
            className="tour-btn-primary"
            style={{ background: step.accent }}
            onClick={handleNavigate}
          >
            <span>Let&apos;s Go</span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Skip tour link */}
        <button className="tour-skip-link" onClick={handleDismiss}>
          Skip tour — I&apos;ll explore myself
        </button>
      </div>
    </div>
  );
}
