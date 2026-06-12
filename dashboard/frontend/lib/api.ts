const getApiBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // Dynamic fallback for browser-side execution
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    const isLocal = hostname === "localhost" || hostname === "127.0.0.1";

    if (isLocal) {
      return "http://localhost:4001";
    } else if (!process.env.NEXT_PUBLIC_API_URL) {
      // Production Self-Healing: Warn if migration is incomplete
      console.warn(
        "%c⚠️ MedieNest Deployment Alert:",
        "color: #ff9800; font-weight: bold; font-size: 14px;",
        "\nMissing NEXT_PUBLIC_API_URL on this live domain. Using localhost fallback (which will likely fail). \nEnsure you have added your Render URL to your Vercel Dashboard.",
      );
    }
  }

  return "http://localhost:4001"; // Default fallback
};

import { createClient } from "./supabase/client";

export const API_BASE_URL = getApiBaseUrl();

export const authenticatedFetch = async (
  url: string,
  options: RequestInit = {},
) => {
  if (
    typeof window !== "undefined" &&
    (window.location.pathname.startsWith("/demo") ||
      window.location.pathname.startsWith("/view-pat") ||
      window.location.pathname === "/view/ae1163db-5002-4341-9cfe-535860ce2593")
  ) {
    let responseData: any = {};
    if (url.includes("/api/patient-history/")) {
      responseData = {
        success: true,
        summary: {
          keyConditions: ["Seasonal Asthma", "Dust Allergy"],
          currentMedications: ["Inhaler Budecort 200 (1 puff SOS)", "Tab. Cetirizine 10mg (1hs)"],
          allergies: ["Penicillin"],
          recentVisitsSummary: "Patient complains of persistent dry cough, moderate wheezing, and fever (102F) since 3 days."
        }
      };
    } else if (url.includes("/api/recommendations/guidance-sheet")) {
      responseData = {
        success: true,
        guidance: {
          understanding_condition: {
            title: "Understanding Your Condition",
            disease_name: "Acute Bronchitis (Triggered by Dust Allergy)",
            points: [
              "Acute bronchitis is an inflammation of the lungs' main breathing passages, causing dry cough and chest tightness.",
              "In this case, the inflammation was triggered by dust inhalation, causing an allergic airway constriction."
            ]
          },
          diet_nutrition: {
            title: "Diet & Nutrition",
            points: [
              "Eat warm soups, ginger tea, and honey to soothe the throat and calm the cough reflex.",
              "Avoid cold water, ice creams, fried food, and heavy dairy which increase phlegm."
            ]
          },
          hydration: {
            title: "Water & Hydration",
            points: [
              "Drink at least 2.5 to 3 liters of warm water daily to thin mucus and clear the chest.",
              "Sip warm herbal infusions frequently to keep the throat moist."
            ],
            tip: "Keep a flask of warm water nearby and drink in small intervals."
          },
          activity_exercise: {
            title: "Activity & Exercise",
            points: [
              "Take complete physical rest for the next 2-3 days to assist recovery.",
              "Inhale steam twice daily for 5-10 minutes to open congested airways."
            ],
            tip: "Avoid high-intensity exercises until chest wheezing fully resolves."
          },
          things_to_avoid: {
            title: "Things To Avoid",
            items: [
              { text: "Dust & Smoke Exposure", reason: "Directly triggers coughing fits and airway spasm." },
              { text: "Cold beverages", reason: "Triggers throat reflex coughing." },
              { text: "Aerosols & Air Sprays", reason: "Can trigger sudden asthmatic breathing difficulties." }
            ]
          },
          warning_signs: {
            title: "Warning Signs",
            red_flags: [
              "High fever (above 103F) or coughing blood-stained phlegm.",
              "Noticeable shortness of breath, wheezing that prevents speaking, or blue lips."
            ],
            follow_up: "Revisit Shukla Care Clinic in 5 days (or immediately if warning signs develop)."
          },
          general_tips: [
            "Wear a face mask when traveling or dusting.",
            "Keep the living space clean, well-ventilated, and allergen-free."
          ]
        }
      };
    } else {
      responseData = { success: true };
    }

    return {
      ok: true,
      status: 200,
      json: () => Promise.resolve(responseData)
    } as Response;
  }

  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = new Headers(options.headers || {});
  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }

  return fetch(url, {
    ...options,
    headers,
  });
};
