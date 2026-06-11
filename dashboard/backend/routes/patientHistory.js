// file: backend/routes/patientHistory.js
const express = require("express");
const router = express.Router();
const { supabase } = require("../supabaseClient");
const { askLLM } = require("../utils/llmRotation");

// Helper: generate patient snapshot via AI (Priority-based comprehensive summary)
async function generatePatientSummary(patient, prescriptions) {
  if (!prescriptions || prescriptions.length === 0) {
    return JSON.stringify({
      keyConditions: ["No medical history recorded"],
      currentMedications: ["None"],
      allergies: [],
      chronicFlags: [],
      recentVisitsSummary: "No previous visits found.",
      totalVisits: 0,
    });
  }

  // Build rich clinical timeline for AI
  const clinicalTimeline = prescriptions.map((p) => {
    let medicines = [];
    try {
      medicines = typeof p.medicines === "string" ? JSON.parse(p.medicines) : (p.medicines || []);
    } catch (e) { medicines = []; }

    return {
      date: p.date,
      complaints: p.complaints || "",
      findings: p.findings || "",
      diagnosis: p.diagnosis || "",
      medicines: medicines.map(m => typeof m === "object" ? { name: m.name, dose: m.dose, freq: m.freq, duration: m.duration } : m),
      advice: p.advice || "",
    };
  });

  const dischargeSummaries = (patient.summaries || []).map(s => ({
    date: s.created_at,
    diagnosis: s.diagnosis || s.final_diagnosis || "",
    complaints: s.complaints,
    findings: s.findings,
    treatment: s.treatment,
    advice: s.advice,
  }));

  const prompt = `You are a clinical data summarizer. Analyze ALL the prescription data and discharge records below for patient "${patient.name}" and produce a PRIORITY-BASED comprehensive clinical snapshot.

CRITICAL RULES:
- RETURN ONLY RAW VALID JSON. No conversational text, no emojis, no markdown code blocks.
- Analyze ALL visits, not just the first or last one.
- Prioritize conditions by clinical significance (chronic/recurring conditions first, then acute).
- Include ALL unique medications the patient has been prescribed across visits.
- Identify patterns: recurring complaints, chronic conditions, medication changes.

JSON SCHEMA (follow exactly):
{
  "keyConditions": ["PRIORITY-ORDERED list of ALL unique diagnoses and significant conditions across ALL visits. Chronic/recurring conditions first, then acute. Max 10 items."],
  "currentMedications": ["ALL unique medications prescribed across visits, most recent first. Include dose if available. Max 12 items."],
  "allergies": ["Any mentioned allergies or drug reactions. Empty array if none mentioned."],
  "chronicFlags": ["Conditions that appear in 2+ visits OR are inherently chronic (e.g. Diabetes, Hypertension, Asthma). Empty array if none."],
  "recentVisitsSummary": "A 2-3 sentence clinical summary covering: total visit count, date range, key clinical patterns, and the most recent visit details.",
  "totalVisits": <number of total visits>
}

CLINICAL DATA (${clinicalTimeline.length} OPD visits, ${dischargeSummaries.length} discharge records):

OPD Prescriptions (newest first):
${JSON.stringify(clinicalTimeline, null, 0)}

${dischargeSummaries.length > 0 ? `Discharge Summaries:\n${JSON.stringify(dischargeSummaries, null, 0)}` : "No discharge records."}
`;

  try {
    let result = await askLLM(
      [{ role: "user", content: prompt }],
      "You are a clinical JSON API. Return ONLY valid JSON. Never include markdown, greetings, or explanations. Analyze ALL provided visit data comprehensively.",
      1800
    );

    // Robust Extraction
    if (result.includes("```json")) {
      result = result.split("```json")[1].split("```")[0].trim();
    } else if (result.includes("```")) {
      result = result.split("```")[1].split("```")[0].trim();
    }

    const jsonMatch = result.match(/\{[\s\S]*\}/);
    return jsonMatch ? jsonMatch[0] : result;
  } catch (err) {
    console.error(
      `[AI ERROR] Patient History Background Refresh Failed:`,
      err.message,
    );
    return null;
  }
}

// Helper: Calculate immediate heuristic summary (WARP SPEED - matches AI schema)
function calculateHeuristicSummary(visits) {
  if (!visits || visits.length === 0) {
    return {
      keyConditions: ["New Patient"],
      currentMedications: ["None recorded"],
      allergies: [],
      chronicFlags: [],
      recentVisitsSummary:
        "This is the patient's first clinical interaction at this facility.",
      totalVisits: 0,
    };
  }

  // Extract ALL unique diagnoses + complaints (priority: diagnosis first, then complaints)
  const diagnosesSet = new Set();
  const complaintsSet = new Set();
  const conditionFrequency = {};

  visits.forEach((v) => {
    // Track diagnoses
    if (v.diagnosis && v.diagnosis.trim()) {
      const d = v.diagnosis.trim();
      diagnosesSet.add(d);
      conditionFrequency[d] = (conditionFrequency[d] || 0) + 1;
    }
    // Track complaints
    if (v.complaints && v.complaints.trim().toLowerCase() !== "routine checkup") {
      const c = v.complaints.trim();
      complaintsSet.add(c);
      conditionFrequency[c] = (conditionFrequency[c] || 0) + 1;
    }
  });

  // Merge: diagnoses first, then any complaints not already covered
  const allConditions = [
    ...Array.from(diagnosesSet),
    ...Array.from(complaintsSet).filter(c => !diagnosesSet.has(c)),
  ].slice(0, 10);

  // Identify chronic flags (conditions appearing 2+ times)
  const chronicFlags = Object.entries(conditionFrequency)
    .filter(([, count]) => count >= 2)
    .map(([name]) => name);

  // Extract ALL unique medications across visits (newest first)
  const medsSet = new Set();
  visits.forEach((v) => {
    (v.medicines || []).forEach((m) => {
      const name = typeof m === "object" ? (m.name || "") : m;
      if (name) medsSet.add(name);
    });
  });
  const allMeds = Array.from(medsSet).slice(0, 12);

  const firstDate = new Date(visits[visits.length - 1].visit_date).toLocaleDateString();
  const lastDate = new Date(visits[0].visit_date).toLocaleDateString();

  return {
    keyConditions: allConditions.length > 0 ? allConditions : ["General Wellness"],
    currentMedications: allMeds.length > 0 ? allMeds : ["No active prescriptions"],
    allergies: [],
    chronicFlags,
    recentVisitsSummary: `${visits.length} recorded visit${visits.length > 1 ? "s" : ""} from ${firstDate} to ${lastDate}. Most recent visit on ${lastDate}.`,
    totalVisits: visits.length,
  };
}


// GET patient history
router.get("/:patientId", async (req, res) => {
  const { patientId } = req.params;
  const clinic_id = req.query.clinic_id || req.body.clinic_id;

  try {
    const { data: patient, error: patErr } = await supabase
      .from("patients")
      .select(
        "id, name, age, gender, contact, blood_group, address, created_at, clinic_id",
      )
      .eq("id", patientId)
      .single();

    if (patErr || !patient) return res.status(404).json({ error: "Patient not found" });

    if (patient.clinic_id !== clinic_id) {
      return res.status(403).json({ error: "Forbidden: Patient record mismatch or access denied" });
    }

    const { data: rawPrescriptions } = await supabase
      .from("prescriptions")
      .select("*")
      .eq("patient_id", patientId)
      .order("date", { ascending: false });

    const visits = (rawPrescriptions || []).map((p) => {
      let medicines = [];
      try {
        medicines =
          typeof p.medicines === "string"
            ? JSON.parse(p.medicines)
            : p.medicines;
      } catch (e) {
        console.error(`️ Prescription ${p.id} has malformed medicines JSON`);
      }

      return {
        visit_date: p.date || p.created_at,
        created_at: p.created_at,
        doctor: p.doctor_name,
        complaints: p.complaints,
        diagnosis: p.diagnosis,
        findings: p.findings,
        medicines: medicines || [],
        advice: p.advice,
        prescription_id: p.id,
      };
    });

    // 1b. Fetch Discharge Summaries
    const { data: rawSummaries } = await supabase
      .from("discharge_summaries")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });

    const summaries = (rawSummaries || []).map((s) => {
      const safeParse = (val) => {
        if (!val) return [];
        try {
          return typeof val === "string" ? JSON.parse(val) : val;
        } catch (e) {
          return [];
        }
      };

      return {
        ...s,
        medicines: safeParse(s.medicines),
        complaints: safeParse(s.complaints),
        findings: safeParse(s.findings),
        treatment: safeParse(s.treatment),
        advice: safeParse(s.advice),
      };
    });

    // 1c. Fetch Admission Records
    const { data: rawAdmissions } = await supabase
      .from("admission_records")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });

    const admissions = (rawAdmissions || []).map((a) => {
      const safeParse = (val) => {
        if (!val) return [];
        try {
          return typeof val === "string" ? JSON.parse(val) : val;
        } catch (e) {
          return [];
        }
      };

      return {
        ...a,
        complaints: safeParse(a.complaints),
        findings: safeParse(a.findings),
        investigations: safeParse(a.investigations),
        treatment_plan: safeParse(a.treatment_plan),
      };
    });

    // 1. Fetch existing cached snapshot
    const { data: existing } = await supabase
      .from("patient_histories")
      .select("summary_text, updated_at")
      .eq("patient_id", patientId)
      .maybeSingle();

    const latestVisitDate =
      visits.length > 0 ? new Date(visits[0].visit_date) : new Date(0);
    const summaryUpdateDate = existing?.updated_at
      ? new Date(existing.updated_at)
      : new Date(0);

    let finalSummary;
    let needsRefresh =
      !existing || latestVisitDate.getTime() > summaryUpdateDate.getTime();

    // 2. Decide what to return IMMEDIATELY
    if (existing?.summary_text) {
      try {
        finalSummary = JSON.parse(existing.summary_text);

        // Force refresh if cache was empty or uses old format (missing new fields)
        if (
          visits.length > 0 &&
          (finalSummary.recentVisitsSummary === "No previous visits found." ||
           finalSummary.totalVisits === undefined ||
           finalSummary.chronicFlags === undefined)
        ) {
          console.log(
            `[REFRESH] Outdated snapshot format detected for ${patient.name}. Forcing AI re-summary.`,
          );
          needsRefresh = true;
          // Use heuristic (which covers ALL visits) instead of stale cache
          finalSummary = calculateHeuristicSummary(visits);
        }
      } catch (e) {
        finalSummary = calculateHeuristicSummary(visits);
        needsRefresh = true;
      }
    } else {
      finalSummary = calculateHeuristicSummary(visits);
    }

    // 3. Trigger AI Refresh - await it to return fresh data
    if (needsRefresh && visits.length > 0) {
      console.log(
        `[WARP SPEED] Generating comprehensive AI snapshot for ${patient.name}...`,
      );
      const patientWithSummaries = { ...patient, summaries };

      try {
        const generatedJson = await generatePatientSummary(patientWithSummaries, rawPrescriptions || []);
        if (generatedJson) {
          try {
            const parsed = JSON.parse(generatedJson);
            finalSummary = parsed; // Use fresh AI data as response
          } catch (parseErr) {
            console.warn(`[AI PARSE] Could not parse AI snapshot, using heuristic.`);
          }

          // Cache in background (don't block response)
          supabase.from("patient_histories").upsert(
            {
              patient_id: patientId,
              summary_text: generatedJson,
              updated_at: new Date(),
            },
            { onConflict: "patient_id" },
          ).then(() => {
            console.log(`[AI CACHE] Refreshed snapshot for ${patient.name}.`);
          });
        }
      } catch (aiErr) {
        console.warn(`[AI ERROR] Snapshot generation failed for ${patient.name}, using heuristic:`, aiErr.message);
        // finalSummary already has heuristic data, so we're fine
      }
    }

    res.json({ patient, visits, summaries, admissions, summary: finalSummary });
  } catch (err) {
    console.error("[SERVER ERROR] Patient History:", err);
    res.status(500).json({ error: "Internal clinical systems error" });
  }
});

module.exports = router;
