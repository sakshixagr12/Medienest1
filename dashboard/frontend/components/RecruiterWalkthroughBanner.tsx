"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sparkles, ArrowRight, X } from "lucide-react";

export default function RecruiterWalkthroughBanner() {
  const pathname = usePathname();
  const router = useRouter();
  const [stepText, setStepText] = useState("");
  const [showTour, setShowTour] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [targetEl, setTargetEl] = useState<HTMLElement | null>(null);
  const [isBelowViewport, setIsBelowViewport] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isDemo = window.location.pathname.startsWith("/demo");
    setShowTour(isDemo);
  }, [pathname]);

  useEffect(() => {
    if (!showTour) return;

    // Determine walkthrough instruction based on pathname
    let interval: NodeJS.Timeout;
    const updateStep = () => {
      // Clear previous highlights
      document.querySelectorAll('[data-tour-highlight="true"]').forEach(el => {
        el.removeAttribute("data-tour-highlight");
      });

      const cleanPath = pathname.replace(/^\/(demo1|demo)/, "");

      if (cleanPath === "/portal") {
        setStepText("Step 1: Dashboard. Click on 'Doctor Dashboard' card to open Dr. Gopal Shukla's consulting queue.");
        
        // Find Doctor Dashboard card
        const cards = document.querySelectorAll("div");
        cards.forEach(el => {
          if (el.textContent?.includes("Doctor Dashboard") && el.className.includes("Card")) {
            el.setAttribute("data-tour-highlight", "true");
          }
        });

        // Also check if modal is open
        const modalTitle = document.querySelector("h3");
        if (modalTitle && modalTitle.textContent?.includes("Select Consulting Doctor")) {
          setStepText("Step 1b: Doctor Selection. Click on 'Dr. Gopal Shukla' in the list to open his workspace.");
          const docItems = document.querySelectorAll("a");
          docItems.forEach(el => {
            if (el.textContent?.includes("Dr. Gopal Shukla")) {
              el.setAttribute("data-tour-highlight", "true");
            }
          });
        }
      } else if (cleanPath === "/portal/doctor-dashboard") {
        setStepText("Step 2: Consultation Queue. Click on 'Rahul Verma' (Token #1, URGENT) to consult.");
        
        // Find the patient name element specifically
        const nameEl = Array.from(document.querySelectorAll('[class*="nowServingName"]')).find(
          el => el.textContent?.includes("Rahul Verma")
        );
        if (nameEl) {
          nameEl.setAttribute("data-tour-highlight", "true");
        } else {
          // Fallback if class name is different
          const cards = document.querySelectorAll("div");
          cards.forEach(el => {
            if (el.textContent?.includes("Rahul Verma") && el.className.includes("nowServing")) {
              el.setAttribute("data-tour-highlight", "true");
            }
          });
        }
      } else if (cleanPath === "/portal/digital-prescription") {
        // Find current states in prescription page
        const ccInput = document.querySelector("textarea[placeholder*='Symptoms']") as HTMLTextAreaElement;
        const adviceBtn = document.querySelector("button[class*='adviceRecommendBtn']");
        const reviewTitle = document.querySelector("div[class*='reviewHeaderTitle']");
        
        // Let's inspect the page dynamically
        const hasPrefilled = ccInput && ccInput.value.length > 0;
        const isReviewOpen = reviewTitle !== null;
        
        // If save button or pdf download is visible after saving
        const hasSaved = document.querySelector("button[title*='WhatsApp']") !== null;

        if (hasSaved) {
          setStepText("Step 6: Download PDF. Click the PDF icon to download the compiled prescription PDF!");
          const pdfBtn = document.querySelector("button[title*='PDF']");
          if (pdfBtn) {
            pdfBtn.setAttribute("data-tour-highlight", "true");
          }
        } else if (isReviewOpen) {
          const acceptAllBtn = document.querySelector("button")?.textContent?.includes("Accept All");
          const footerSaveBtn = document.querySelector("button[class*='primary']");
          
          // Check if disabled
          if (footerSaveBtn && (footerSaveBtn as HTMLButtonElement).disabled) {
            setStepText("Step 5a: Approve AI. Click 'Accept All' to approve all AI guidance sections (lifestyle, diet, etc.).");
            const btns = document.querySelectorAll("button");
            btns.forEach(btn => {
              if (btn.textContent?.includes("Accept All")) {
                btn.setAttribute("data-tour-highlight", "true");
              }
            });
          } else {
            setStepText("Step 5b: Save. Click 'Confirm & Save Prescription' to write it to database and complete session.");
            if (footerSaveBtn) footerSaveBtn.setAttribute("data-tour-highlight", "true");
          }
        } else if (hasPrefilled) {
          setStepText("Step 4: AI Care Sheet. Click the green 'Advice & Recommendation' button to generate the AI guidance sheet.");
          if (adviceBtn) adviceBtn.setAttribute("data-tour-highlight", "true");
        } else {
          setStepText("Step 3: Autofill details. Click the purple 'Autofill Demo' banner to populate complaints, vitals and medicines.");
          const autofillBanner = document.querySelector('[data-tour-highlight="autofill-banner"]');
          if (autofillBanner) autofillBanner.setAttribute("data-tour-highlight", "true");
        }
      } else {
        setStepText("Demo Mode active. Feel free to explore the system! Click 'Finish Tour' when done.");
      }
    };

    // Poll to keep highlighting updated when DOM elements mount/unmount
    updateStep();
    interval = setInterval(updateStep, 1000);

    return () => clearInterval(interval);
  }, [pathname, showTour]);

  // Track the highlighted element position
  useEffect(() => {
    if (!showTour) {
      setRect(null);
      setTargetEl(null);
      setIsBelowViewport(false);
      return;
    }

    const updatePosition = () => {
      const activeEl = document.querySelector('[data-tour-highlight="true"]') as HTMLElement;
      if (activeEl) {
        setTargetEl(activeEl);
        const bounding = activeEl.getBoundingClientRect();
        setRect(bounding);
        
        // Check if the element is below the fold or not fully visible
        const isBelow = bounding.top > window.innerHeight - 80;
        setIsBelowViewport(isBelow);
      } else {
        setTargetEl(null);
        setRect(null);
        setIsBelowViewport(false);
      }
    };

    updatePosition();
    const interval = setInterval(updatePosition, 300);
    
    window.addEventListener("scroll", updatePosition, { passive: true });
    window.addEventListener("resize", updatePosition);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener("scroll", updatePosition);
      window.removeEventListener("resize", updatePosition);
    };
  }, [showTour, pathname, stepText]);

  const finishTour = () => {
    sessionStorage.removeItem("is_demo_mode");
    document.cookie = "is_demo_mode=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    setShowTour(false);
    document.querySelectorAll('[data-tour-highlight="true"]').forEach(el => {
      el.removeAttribute("data-tour-highlight");
    });
    const prefix = pathname?.startsWith("/demo1") ? "/demo1" : "/demo";
    router.push(prefix);
  };

  if (!showTour) return null;

  const showFloatingArrow = rect && rect.width > 0 && !isBelowViewport;

  return (
    <>
      <style>{`
        .walkthrough-banner {
          background: linear-gradient(135deg, #1e1145 0%, #11052c 100%);
          border-bottom: 2.5px solid #7c3aed;
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.4);
          position: sticky;
          top: 0;
          left: 0;
          right: 0;
          z-index: 99999;
          padding: 14px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          color: white;
          font-family: sans-serif;
        }
        .walkthrough-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .walkthrough-badge {
          background: linear-gradient(90deg, #7c3aed, #0d9488);
          color: white;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          box-shadow: 0 0 15px rgba(124, 58, 237, 0.4);
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .walkthrough-text {
          font-size: 14px;
          font-weight: 600;
          color: #f1f5f9;
        }
        .walkthrough-btn {
          background: linear-gradient(90deg, #7c3aed, #6d28d9);
          border: none;
          color: white;
          padding: 8px 18px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 15px rgba(124, 58, 237, 0.3);
        }
        .walkthrough-btn:hover {
          background: linear-gradient(90deg, #8b5cf6, #7c3aed);
          box-shadow: 0 6px 20px rgba(124, 58, 237, 0.5);
          transform: translateY(-1px);
        }

        /* Target highlighting classes */
        [data-tour-highlight="true"] {
          position: relative;
          outline: 4px solid #7c3aed !important;
          outline-offset: 4px;
          box-shadow: 0 0 30px rgba(124, 58, 237, 0.7) !important;
          animation: tour-pulse 1.5s infinite alternate !important;
          z-index: 1000 !important;
          transition: all 0.2s ease-in-out;
        }
        p[data-tour-highlight="true"], span[data-tour-highlight="true"] {
          width: fit-content;
        }

        @keyframes tour-pulse {
          0% { box-shadow: 0 0 10px rgba(124, 58, 237, 0.4); outline-color: rgba(124, 58, 237, 0.6); }
          100% { box-shadow: 0 0 35px rgba(124, 58, 237, 0.9); outline-color: rgba(124, 58, 237, 1); }
        }

        @keyframes bounce-down {
          0% { transform: translateY(0); }
          100% { transform: translateY(-8px); }
        }

        @keyframes bounce-down-fixed {
          0% { transform: translate(-50%, 0); }
          100% { transform: translate(-50%, -6px); }
        }
        
        .tour-arrow-svg {
          filter: drop-shadow(0 3px 5px rgba(124, 58, 237, 0.5));
        }
      `}</style>

      <div className="walkthrough-banner">
        <div className="walkthrough-info">
          <div className="walkthrough-badge">
            <Sparkles size={13} /> Demo Guide
          </div>
          <span className="walkthrough-text">{stepText}</span>
        </div>
        <button className="walkthrough-btn" onClick={finishTour}>
          Finish Tour
        </button>
      </div>

      {showFloatingArrow && rect && (
        <div
          className="tour-arrow-container"
          style={{
            position: "absolute",
            top: rect.top + window.scrollY - 45,
            left: rect.left + window.scrollX + rect.width / 2 - 15,
            width: 30,
            height: 30,
            zIndex: 999999,
            pointerEvents: "none",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            animation: "bounce-down 0.6s infinite alternate ease-in-out",
          }}
        >
          <svg
            className="tour-arrow-svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#7c3aed"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="4" x2="12" y2="20"></line>
            <polyline points="18 14 12 20 6 14"></polyline>
          </svg>
        </div>
      )}

      {isBelowViewport && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
            color: "white",
            padding: "12px 24px",
            borderRadius: "50px",
            boxShadow: "0 10px 30px rgba(124, 58, 237, 0.6)",
            zIndex: 999999,
            fontWeight: "bold",
            fontSize: "14px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            animation: "bounce-down-fixed 0.6s infinite alternate ease-in-out",
            pointerEvents: "none",
            border: "2px solid rgba(255, 255, 255, 0.2)",
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="4" x2="12" y2="20"></line>
            <polyline points="18 14 12 20 6 14"></polyline>
          </svg>
          Scroll Down to Continue
        </div>
      )}
    </>
  );
}
