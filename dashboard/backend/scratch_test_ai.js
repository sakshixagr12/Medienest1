const { createClient } = require("@supabase/supabase-js");
const { askLLM } = require("./utils/llmRotation");
require("dotenv").config();

const run = async () => {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const rxId = "7bac2236-fc12-4a67-9d6d-0ad2366d359d";

  console.log("Fetching prescription...");
  const { data: rx, error } = await supabase
    .from("prescriptions")
    .select("*, patients(name)")
    .eq("id", rxId)
    .single();

  if (error || !rx) {
    console.error("Prescription not found:", error);
    return;
  }

  console.log("Prescription loaded. Patient name:", rx.patients?.name);

  // Re-mimic the server logic for prompt and generation
  const patientName = rx.patients?.name || "Patient";
  let medicines = [];
  try {
    medicines = typeof rx.medicines === "string" ? JSON.parse(rx.medicines) : rx.medicines || [];
  } catch (err) {
    console.error("Meds parse error:", err);
  }

  const lang = "English";
  const systemRole = `
You are the "Secure AI Agent Record", a specialized clinical assistant. Your goal is to provide a reassuring, safe, and professional recovery guide.

IMPORTANT: RETURN ONLY A PURE JSON OBJECT. NO PREAMBLE. NO GREETINGS. NO INTRODUCTIONS.

AI ROLE:
- You ONLY explain the doctor's prescription. You DO NOT prescribe or guess.

MEDICAL RULES (STRICT):
1. DOSAGE LOGIC: 
   - IF doctor provided dosage/frequency (e.g., "1-0-1", "SOS"): Show EXACT SAME and explain it (e.g., ${lang === "Hindi" ? '"1-0-1 (सुबह-दोपहर-शाम)"' : '"1-0-1 (Morning-Noon-Night)"'}).
   - IF doctor did NOT provide dosage: DO NOT GUESS. Show: ${lang === "Hindi" ? '"डॉक्टर के अनुसार लें"' : '"As directed by doctor"'}.
2. FORBIDDEN: NEVER suggest "Twice a day", "Morning/Night", or "5 days" unless explicitly provided in the INPUT med list.
3. PROTOCOLS: If Dengue/Viral detected, prioritize hydration and bleeding warning signs.

TONE & STYLE:
- Warm, encouraging, supportive in ${lang}.
- Use specific emojis: 💊, ⏳, 🥗, ⚠️, 🩺.

JSON OUTPUT FORMAT:
{
  "greeting": "Hello ${patientName}",
  "condition": "Explanation of the illness in ${lang}",
  "medicines": [
    {
      "name": "Medicine name in ${lang}",
      "purpose": "Purpose of medicine in ${lang}",
      "dosage": "Exact dosage from input + explanation ${lang === "Hindi" ? "(e.g. 1-0-1 (सुबह-दोपहर-शाम))" : "(e.g. 1-0-1 (Morning-Noon-Night))"} OR ${lang === "Hindi" ? "डॉक्टर के अनुसार लें" : "As directed by doctor"}"
    }
  ],
  "expectations": "Brief recovery timeline and what the patient should expect in the next 2-3 days in ${lang}",
  "care": "Simple diet/rest points in ${lang}",
  "warnings": ["Alerts in ${lang}"],
  "next_steps": "Closing in ${lang}"
}
`;

  const userPrompt = `
INPUT DATA:
- Patient: ${patientName}
- Diagnosis: ${rx.diagnosis || "N/A"}
- Findings (O/E): ${rx.findings || "N/A"}
- Symptoms: ${rx.complaints || "N/A"}
- Medicines: ${JSON.stringify(medicines)}
- Advice: ${rx.advice}
- Follow-up Date: ${rx.valid_till || "N/A"}
`;

  console.log("Calling LLM...");
  try {
    const response = await askLLM(
      [{ role: "user", content: userPrompt }],
      systemRole,
      2000
    );
    console.log("LLM Response raw:\n", response);
  } catch (err) {
    console.error("LLM call failed:", err);
  }
};

run();
