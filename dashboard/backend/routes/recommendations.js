// dashboard/backend/routes/recommendations.js
const express = require("express");
const router = express.Router();
const { z } = require("zod");
const { askLLM } = require("../utils/llmRotation");

/**
 * Generates clinical lifestyle companion advice using LLM rotation.
 * Removes all drug recommendations and database queries.
 */
async function suggestClinicalPath(cc, findings, context = {}) {
  try {
    const systemPrompt = `You are a clinical lifestyle companion AI.
Analyze the prescription, doctor notes, patient age, symptoms, and medical history.
Generate exactly 3–5 short, personalized bullet points for recovery support.

Rules:
1. Include ONLY: diet, hydration, sleep, activity (what to do), what to avoid, and general recovery care tips.
2. NEVER mention medicines, medication adherence, dosage changes, diagnoses, or tests.
3. Keep each point under 12 words and easy for patients to understand.
4. Output EXACTLY 3 to 5 lines.
5. Each line MUST start with a green checkmark emoji "✅ " (e.g., ✅ Drink 2–3 liters of water daily.).
6. Avoid using any other formatting, list, or header symbols (do NOT use '*', '#', '-', or '_' in the output). Keep the lines clean and simple.`;

    const userContent = `Patient Details:
- Age: ${context.age || "N/A"}
- Gender: ${context.gender || "N/A"}
- Weight: ${context.weight ? context.weight + " kg" : "N/A"}
- Existing Conditions: ${context.existing_conditions || "None reported"}
- Dietary Preference: ${context.dietary_preference || "None reported"}
- Lifestyle Details: ${context.lifestyle || "None reported"}

Clinical Details:
- Chief Complaint: ${cc || "N/A"}
- Findings: ${findings || "N/A"}
- Doctor's Diagnosis: ${context.diagnosis || "None entered yet"}
- Prescribed Medicines: ${context.medicines && context.medicines.length > 0 
    ? context.medicines.map(m => `${m.type || 'Tab'}. ${m.name} (${m.dose || ''})`).join(', ') 
    : "None prescribed yet"}`;

    const content = await askLLM(
      [{ role: "user", content: userContent }],
      systemPrompt,
      2000
    );

    return {
      probable_diagnosis: context.diagnosis || "Clinical Evaluation",
      recommendations: [], // Explicitly empty to remove all medicine predictions
      advice: content || "",
      differentials: [],
      investigations: {
        primary: [],
        secondary: []
      },
      severity: "mild",
      confidence: 1.0
    };
  } catch (err) {
    console.error("[Clinical AI] Error generating path:", err);
    return {
      error: err.message || "Failed to generate suggestions"
    };
  }
}

const recommendSchema = z.object({
  cc: z.string().max(500).optional().default(""),
  findings: z.string().max(500).optional().default(""),
  diagnosis: z.string().max(500).optional().default(""),
  medicines: z.array(z.any()).optional().default([]),
  age: z.union([z.string(), z.number()]).optional().default(""),
  gender: z.string().optional().default(""),
  weight: z.union([z.string(), z.number()]).optional().default(""),
  existing_conditions: z.string().max(500).optional().default(""),
  dietary_preference: z.string().max(100).optional().default(""),
  lifestyle: z.string().max(500).optional().default(""),
});

router.post("/suggest", async (req, res) => {
  const parsed = recommendSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: "Invalid input",
      details: parsed.error.flatten(),
    });
  }

  const {
    cc,
    findings,
    diagnosis,
    medicines,
    age,
    gender,
    weight,
    existing_conditions,
    dietary_preference,
    lifestyle,
  } = parsed.data;

  const suggestions = await suggestClinicalPath(cc, findings, {
    age,
    gender,
    weight,
    diagnosis,
    medicines,
    existing_conditions,
    dietary_preference,
    lifestyle,
  });

  // Simulated Audit Log
  console.log(
    `[AUDIT] LIFESTYLE AI CASE: ${age}y ${gender} CC: ${cc} Conditions: ${existing_conditions}`
  );

  res.json({ success: true, suggestions });
});

module.exports = router;
module.exports.suggestClinicalPath = suggestClinicalPath;
