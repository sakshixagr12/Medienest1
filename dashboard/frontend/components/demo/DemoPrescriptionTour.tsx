"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import "../DemoTourOverlay.css";
import "./DemoPrescriptionTour.css";

interface TourStep {
  selector: string;
  title: string;
  description: string;
  placement: "bottom" | "top" | "left" | "right";
  accent: string;
  icon: string;
  ctaLabel?: string;
  scrollIntoView?: boolean;
  scrollPosition?: "top" | "center";
  isCustomAction?: boolean;
  customActionLabel?: string;
}

interface DemoPrescriptionTourProps {
  activeTab: "info" | "rx";
  setActiveTab: (tab: "info" | "rx") => void;
  setCc: (val: string) => void;
  setFindings: (val: string) => void;
  setDiagnosis: (val: string) => void;
  setMeds: (val: any[]) => void;
  setAdvice: (val: string) => void;
  generateGuidance: () => Promise<void>;
  setIsGeneratingGuidance: (val: boolean) => void;
  setGuidanceApproved: (val: boolean) => void;
}

const TOUR_STEPS: TourStep[] = [
  {
    selector: "[data-tour='ai-snapshot']",
    title: "AI Clinical Snapshot",
    description:
      "This card displays the patient's synthesized history compiled by AI from prior visits. It highlights active conditions, chronic concerns, allergies, and prior medications instantly, giving the doctor instant context.",
    placement: "right",
    accent: "#0ea5e9",
    icon: "🧠",
  },
  {
    selector: "[data-tour='clinical-notes']",
    title: "Clinical Notes & Autofill",
    description:
      "Doctors document symptoms, clinical findings, and official diagnosis here. Instead of manual data entry, you can click the button below to autofill this section instantly.",
    placement: "right",
    accent: "#8b5cf6",
    icon: "✍️",
    isCustomAction: true,
    customActionLabel: "Autofill Clinical Notes",
  },
  {
    selector: "[data-tour='prescribe-medicine']",
    title: "AI Prescription & Meds",
    description:
      "With the diagnosis established, we can prescribe medications. Click below to automatically prescribe 3 standard medicines tailored to the diagnosis, with dosage and note instructions.",
    placement: "right",
    accent: "#f59e0b",
    icon: "💊",
    isCustomAction: true,
    customActionLabel: "Add 3 Medicines",
  },
  {
    selector: "[data-tour='advice-recommend-btn']",
    title: "Generate AI Care Sheet",
    description:
      "To assist the patient's recovery, click 'Generate AI Care Sheet'. Our medical AI analyzes the consult and generates patient-friendly diet, hydration, activity, and warning guidelines.",
    placement: "right",
    accent: "#10b981",
    icon: "✨",
    isCustomAction: true,
    customActionLabel: "Generate AI Care Sheet",
  },
  {
    selector: "[data-tour='export-actions']",
    title: "Save & Share Toolbar",
    description:
      "Save the digital prescription directly to the clinic's database, download it as a print-ready PDF or image, or share the patient view link instantly via WhatsApp.",
    placement: "top",
    accent: "#3b82f6",
    icon: "📤",
  },
  {
    selector: "[data-tour='rx-preview']",
    title: "Page 1: Digital Prescription",
    description:
      "Here is Page 1 of the generated PDF document—the clinical prescription. It is fully formatted with doctor qualifications, patient details, diagnosis, and prescription medications, ready to print or share.",
    placement: "left",
    accent: "#0d6e56",
    icon: "📄",
    scrollPosition: "top",
  },
  {
    selector: "[data-tour='guidance-preview']",
    title: "Page 2: AI Patient Guidance",
    description:
      "Here is Page 2—the AI Patient Guidance Sheet. It translates clinical directions into simple patient guidelines like diet, lifestyle, and red-flags, ensuring better home care and fast recovery.",
    placement: "left",
    accent: "#10b981",
    icon: "🛡️",
    scrollPosition: "top",
  },
];

export default function DemoPrescriptionTour({
  activeTab,
  setActiveTab,
  setCc,
  setFindings,
  setDiagnosis,
  setMeds,
  setAdvice,
  generateGuidance,
  setIsGeneratingGuidance,
  setGuidanceApproved,
}: DemoPrescriptionTourProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showPatientHubPopup, setShowPatientHubPopup] = useState(false);
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
    const tooltipH = step.isCustomAction ? 290 : 250;
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
    
    // Smoothly scroll the first step target into view immediately on page load
    const el = document.querySelector(TOUR_STEPS[0].selector);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    
    // Wait exactly 1000ms for smooth scroll to finish before displaying tour tooltip
    const timer = setTimeout(() => {
      setVisible(true);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [dismissed]);

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
    
    // Reposition spotlight and wait 100ms for layout to settle before fading back in
    positionSpotlight();
    const timer = setTimeout(() => {
      setIsTransitioning(false);
    }, 100);
    return () => clearTimeout(timer);
  }, [currentStep, visible, step, positionSpotlight]);

  const goToStepDirect = (idx: number) => {
    setIsTransitioning(true);
    setCurrentStep(idx);
    
    const nextStep = TOUR_STEPS[idx];
    if (nextStep) {
      if (idx === 4) {
        // Special dual scroll for Step 5: scroll left panel to bottom, right panel to top
        const formPanel = document.querySelector('[class*="formPanel"]');
        const previewPanel = document.querySelector('[class*="previewPanel"]');
        if (formPanel) {
          formPanel.scrollTo({ top: formPanel.scrollHeight, behavior: 'smooth' });
        }
        if (previewPanel) {
          previewPanel.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } else {
        const el = document.querySelector(nextStep.selector);
        if (el) {
          const container = el.closest('[class*="formPanel"]') || el.closest('[class*="previewPanel"]') || document.documentElement;
          if (container && container !== document.documentElement) {
            const containerRect = container.getBoundingClientRect();
            const elRect = el.getBoundingClientRect();
            
            let scrollTop = 0;
            if (nextStep.scrollPosition === "top") {
              scrollTop = container.scrollTop + (elRect.top - containerRect.top) - 24;
            } else {
              scrollTop = container.scrollTop + (elRect.top - containerRect.top) - (containerRect.height / 2) + (elRect.height / 2);
            }
            container.scrollTo({ top: scrollTop, behavior: 'smooth' });
          } else {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }
      }
    }
  };

  const goToStep = (idx: number) => {
    setIsTransitioning(true);
    
    // Smoothly scroll target element into view IMMEDIATELY when transition starts
    const nextStep = TOUR_STEPS[idx];
    if (nextStep) {
      if (idx === 4) {
        // Special dual scroll for Step 5: scroll left panel to bottom, right panel to top
        const formPanel = document.querySelector('[class*="formPanel"]');
        const previewPanel = document.querySelector('[class*="previewPanel"]');
        if (formPanel) {
          formPanel.scrollTo({ top: formPanel.scrollHeight, behavior: 'smooth' });
        }
        if (previewPanel) {
          previewPanel.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } else {
        const el = document.querySelector(nextStep.selector);
        if (el) {
          const container = el.closest('[class*="formPanel"]') || el.closest('[class*="previewPanel"]') || document.documentElement;
          if (container && container !== document.documentElement) {
            const containerRect = container.getBoundingClientRect();
            const elRect = el.getBoundingClientRect();
            
            let scrollTop = 0;
            if (nextStep.scrollPosition === "top") {
              scrollTop = container.scrollTop + (elRect.top - containerRect.top) - 24;
            } else {
              scrollTop = container.scrollTop + (elRect.top - containerRect.top) - (containerRect.height / 2) + (elRect.height / 2);
            }
            container.scrollTo({ top: scrollTop, behavior: 'smooth' });
          } else {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }
      }
    }

    // Wait exactly 2.5s for scrolling to complete and user to view the area before updating step and fading in
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

  // Custom simulation handlers with 2.5 second pacing
  const handleAutofillNotes = () => {
    setCc("Persistent dry cough, moderate chest tightness, and mild wheezing since 3 days.");
    setFindings("Bilateral expiratory wheezing present on auscultation. Throat congested.");
    setDiagnosis("Acute Bronchitis (Triggered by Dust Allergy)");
    
    // Pause 2.5s so user can read the newly typed clinical notes, then change tab
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveTab("rx");
      
      // Auto-scroll to prescribing section inside meds tab immediately
      setTimeout(() => {
        const el = document.querySelector("[data-tour='prescribe-medicine']");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);
      
      // Pause another 2.5s so user can see tab shift to meds list, then show Step 3 tooltip
      setTimeout(() => {
        goToStepDirect(2);
      }, 2500);
    }, 2500);
  };

  const handleAddMedicines = () => {
    setMeds([
      {
        id: "m-para",
        name: "TAB. PARACETAMOL",
        type: "Tab",
        dose: "650mg",
        freq: "1-0-1",
        duration: "3 Days",
        instructions: "After Meal",
        note: "Take if fever exceeds 100F",
      },
      {
        id: "m-cetirizine",
        name: "TAB. CETIRIZINE",
        type: "Tab",
        dose: "10mg",
        freq: "0-0-1",
        duration: "5 Days",
        instructions: "After Meal",
        note: "May cause mild drowsiness. Take at bedtime.",
      },
      {
        id: "m-budecort",
        name: "INHALER BUDECORT 200",
        type: "Inj",
        dose: "200mcg",
        freq: "1 puff SOS",
        duration: "7 Days",
        instructions: "Before Meal",
        note: "Rinse mouth with water after inhalation.",
      },
    ]);
    setAdvice("Drink warm water frequently. Complete physical rest for 3 days. Do steam inhalation twice daily.");

    // Pause 2.5s so user can see the 3 medicines added to prescription list, then scroll
    setIsTransitioning(true);
    setTimeout(() => {
      const el = document.querySelector("[data-tour='advice-recommend-btn']");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      
      // Pause another 2.5s after scrolling before presenting Step 4 tooltip
      setTimeout(() => {
        goToStepDirect(3);
      }, 2500);
    }, 2500);
  };

  const handleGenerateGuidanceAction = async () => {
    setIsGeneratingGuidance(true);
    
    // Pause 2.5s to show a premium AI generation status spinner
    setTimeout(async () => {
      await generateGuidance();
      setGuidanceApproved(true);
      setIsGeneratingGuidance(false);

      // Scroll preview panel to top (Page 1 preview) immediately
      const previewEl = document.querySelector(`[class*="previewPanel"]`);
      if (previewEl) {
        previewEl.scrollTo({ top: 0, behavior: "smooth" });
      }

      // Pause another 2.5s for user to view generated prescription sheet, then present Step 5 tooltip
      setIsTransitioning(true);
      setTimeout(() => {
        goToStepDirect(4);
      }, 2500);
    }, 2500);
  };

  const handleFinishTour = () => {
    setShowPatientHubPopup(true);
  };

  if ((dismissed || !visible) && !showPatientHubPopup) return null;

  const spotPad = 10;
  const isLastStep = currentStep === TOUR_STEPS.length - 1;

  // Render correct custom CTA button in tooltip if needed
  const renderCustomActionButton = () => {
    if (!step.isCustomAction) return null;
    if (currentStep === 1) {
      return (
        <button className="rx-tour-action-btn" onClick={handleAutofillNotes}>
          ⚡ {step.customActionLabel}
        </button>
      );
    }
    if (currentStep === 2) {
      return (
        <button className="rx-tour-action-btn" onClick={handleAddMedicines}>
          💊 {step.customActionLabel}
        </button>
      );
    }
    if (currentStep === 3) {
      return (
        <button className="rx-tour-action-btn" onClick={handleGenerateGuidanceAction}>
          ✨ {step.customActionLabel}
        </button>
      );
    }
    return null;
  };

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
            <mask id="prescription-tour-spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              <rect
                x={spotlightRect.left - spotPad}
                y={spotlightRect.top - spotPad}
                width={spotlightRect.width + spotPad * 2}
                height={spotlightRect.height + spotPad * 2}
                rx="12"
                ry="12"
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
            mask="url(#prescription-tour-spotlight-mask)"
          />
          {/* Spotlight Highlight Borders */}
          <rect
            className="tour-spotlight-ring"
            x={spotlightRect.left - spotPad}
            y={spotlightRect.top - spotPad}
            width={spotlightRect.width + spotPad * 2}
            height={spotlightRect.height + spotPad * 2}
            rx="12"
            ry="12"
            fill="none"
            stroke={step.accent}
            strokeWidth="2.5"
            style={{ "--tour-accent": step.accent } as React.CSSProperties}
          />
        </svg>
      )}

      {/* Bouncing Arrow Indicators */}
      {spotlightRect && (
        <div
          className={`tour-arrow tour-arrow-${step.placement}`}
          style={{
            ...arrowStyle,
            color: step.accent,
          }}
        >
          {step.placement === "bottom" && (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z" transform="rotate(180 12 12)" />
            </svg>
          )}
          {step.placement === "top" && (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z" />
            </svg>
          )}
          {step.placement === "left" && (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z" transform="rotate(-90 12 12)" />
            </svg>
          )}
          {step.placement === "right" && (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z" transform="rotate(90 12 12)" />
            </svg>
          )}
        </div>
      )}

      {/* Tooltip Card */}
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

        {/* Progress dots indicator */}
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

        <div className="tour-tooltip-actions" style={{ justifyContent: step.isCustomAction ? "center" : "space-between" }}>
          {step.isCustomAction ? (
            renderCustomActionButton()
          ) : (
            <>
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
                  Finish Demo 🎉
                </button>
              ) : (
                <button
                  className="tour-btn-primary"
                  style={{ background: step.accent }}
                  onClick={handleNext}
                >
                  Next Step →
                </button>
              )}
            </>
          )}
        </div>

        <button className="tour-skip-link" onClick={handleDismiss}>
          Skip guided walkthrough
        </button>
      </div>

      {showPatientHubPopup && (
        <div className="patient-hub-popup-overlay">
          <div className="patient-hub-popup-card">
            <div className="patient-hub-popup-badge">📱 Interactive Demo</div>
            <h2>Want to see how the patient views their prescription?</h2>
            <p>
              MedieNest automatically generates a secure, mobile-friendly <b>Patient Health Hub</b> where patients can view their prescription, read AI-generated clinical care sheets, listen to audio summaries in their preferred language, and track their medical history.
            </p>
            <div className="patient-hub-popup-actions">
              <button 
                className="patient-hub-popup-btn-primary" 
                onClick={() => {
                  setVisible(false);
                  setDismissed(true);
                  setShowPatientHubPopup(false);
                  router.push("/view-pat/9980");
                }}
              >
                Open Patient View 📱
              </button>
              <button 
                className="patient-hub-popup-btn-secondary" 
                onClick={() => {
                  setVisible(false);
                  setDismissed(true);
                  setShowPatientHubPopup(false);
                  router.push("/demo/portal?showPresentation=true");
                }}
              >
                Skip, End Demo & View Project Summary →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
