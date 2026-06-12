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
    const systemPrompt = `You are a healthcare lifestyle assistant.

You are NOT allowed to:
- Prescribe medicines
- Recommend medicine doses
- Suggest diagnostic tests
- Modify doctor prescriptions
- Diagnose diseases

Your role is to generate patient-friendly guidance based on the doctor's diagnosis, symptoms, age, gender, and prescribed treatment.

Generate ONLY:
1. Lifestyle Recommendations
2. Diet Recommendations
3. Hydration Advice
4. Activity/Exercise Advice
5. Sleep Recommendations
6. Things To Avoid
7. Follow-up Reminders
8. Red Flag Symptoms requiring medical attention

Rules:
- Maximum 6 bullet points.
- Use simple language understandable by patients.
- Be disease-specific.
- Never contradict the doctor's prescription.
- Never mention medicines.
- Never claim to cure the disease.
- Output concise prescription-ready text.
- Start each bullet point with "✓ " (e.g., ✓ Stay well hydrated throughout the day.). Do not use any markdown formatting or lists.`;

    const treatmentText = context.medicines && context.medicines.length > 0 
      ? context.medicines.map(m => `${m.type || 'Tab'}. ${m.name} (${m.dose || ''})`).join(', ') 
      : "None prescribed yet";

    const userContent = `Patient Age: ${context.age || "N/A"}
Gender: ${context.gender || "N/A"}

Diagnosis:
${context.diagnosis || "None entered yet"}

Symptoms:
${cc || "None"}
${findings ? `\nFindings:\n${findings}` : ""}

Prescribed Treatment:
${treatmentText}

Generate prescription-ready patient advice.`;

    const content = await askLLM(
      [{ role: "user", content: userContent }],
      systemPrompt,
      2000
    );

    return {
      probable_diagnosis: "", // Completely removed AI diagnosis suggestion
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

// ─── Patient Guidance Sheet Generator ───
const guidanceSchema = z.object({
  diagnosis: z.string().max(500).optional().default(""),
  cc: z.string().max(500).optional().default(""),
  findings: z.string().max(500).optional().default(""),
  medicines: z.array(z.any()).optional().default([]),
  age: z.union([z.string(), z.number()]).optional().default(""),
  gender: z.string().optional().default(""),
  weight: z.union([z.string(), z.number()]).optional().default(""),
  existing_conditions: z.string().max(1000).optional().default(""),
  follow_up_date: z.string().optional().default(""),
  clinic_name: z.string().optional().default(""),
  doctor_name: z.string().optional().default(""),
});

async function generateGuidanceSheet(context) {
  const treatmentText = context.medicines && context.medicines.length > 0
    ? context.medicines.map(m => `${m.type || 'Tab'}. ${m.name} ${m.dose || ''} (${m.freq || ''}, ${m.duration || ''})`).join('; ')
    : "None prescribed yet";

  const systemPrompt = `You are a clinical patient education specialist.

You are NOT allowed to:
- Prescribe or suggest medicines
- Recommend dosage changes
- Diagnose diseases
- Suggest diagnostic tests
- Contradict the doctor's prescription

You MUST generate a structured Patient Guidance Sheet in JSON format with exactly 6 sections + general tips.
Each section must be disease-specific, age-appropriate, and use simple patient-friendly language.

CRITICAL: Return ONLY valid JSON. No markdown, no code blocks, no explanations.`;

  const userContent = `Generate a Patient Guidance Sheet for:
Patient: ${context.age || "N/A"} year old ${context.gender || "patient"}
Diagnosis: ${context.diagnosis || "General consultation"}
Symptoms: ${context.cc || "Not specified"}
${context.findings ? `Clinical Findings: ${context.findings}` : ""}
Prescribed Treatment: ${treatmentText}
${context.existing_conditions ? `Existing Conditions: ${context.existing_conditions}` : ""}
${context.follow_up_date ? `Follow-up Date: ${context.follow_up_date}` : ""}

Return JSON with this EXACT structure:
{
  "understanding_condition": {
    "title": "Understanding Your Condition",
    "disease_name": "The diagnosed condition name",
    "points": ["3-4 bullet points explaining the condition in simple terms"]
  },
  "diet_nutrition": {
    "title": "Diet & Nutrition",
    "points": ["4-5 specific diet recommendations"]
  },
  "hydration": {
    "title": "Water & Hydration",
    "points": ["3-4 hydration tips"],
    "tip": "One important hydration insight"
  },
  "activity_exercise": {
    "title": "Activity & Exercise",
    "points": ["4-5 exercise/activity recommendations"],
    "tip": "One important activity insight"
  },
  "things_to_avoid": {
    "title": "Things To Avoid",
    "items": [{"text": "Thing to avoid", "reason": "Brief reason"}]
  },
  "warning_signs": {
    "title": "Warning Signs & Follow-up",
    "red_flags": ["5-6 symptoms requiring immediate medical attention"],
    "follow_up": "Follow-up instruction based on condition"
  },
  "general_tips": ["5 one-line general care tips for the footer"]
}`;

  try {
    let result = await askLLM(
      [{ role: "user", content: userContent }],
      systemPrompt,
      3000
    );

    // Robust JSON extraction
    if (result.includes("```json")) {
      result = result.split("```json")[1].split("```")[0].trim();
    } else if (result.includes("```")) {
      result = result.split("```")[1].split("```")[0].trim();
    }

    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return { success: true, guidance: parsed };
    }

    return { success: false, error: "Failed to parse AI response" };
  } catch (err) {
    console.error("[Guidance Sheet AI] Error:", err.message);
    return { success: false, error: err.message || "AI generation failed" };
  }
}

router.post("/guidance-sheet", async (req, res) => {
  const parsed = guidanceSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: "Invalid input",
      details: parsed.error.flatten(),
    });
  }

  console.log(
    `[AUDIT] GUIDANCE SHEET: ${parsed.data.age}y ${parsed.data.gender} Dx: ${parsed.data.diagnosis}`
  );

  const result = await generateGuidanceSheet(parsed.data);
  res.json(result);
});

module.exports = router;
module.exports.suggestClinicalPath = suggestClinicalPath;
module.exports.generateGuidanceSheet = generateGuidanceSheet;

