// file: backend/routes/patientHistory.js
const express = require('express');
const router = express.Router();
const { supabase } = require('../supabaseClient');

// Helper: generate patient snapshot via NVIDIA
async function generatePatientSummary(patient, prescriptions) {
  if (!prescriptions || prescriptions.length === 0) {
    return JSON.stringify({
      keyConditions: ["No medical history recorded"],
      currentMedications: ["None"],
      recentVisitsSummary: "No previous visits found."
    });
  }

  const prompt = `Summarize the clinical history for ${patient.name} into a structured JSON snapshot.
  
  CRITICAL: RETURN ONLY RAW VALID JSON. Do not include any conversational text, emojis, or markdown code blocks.
  
  JSON SCHEMA:
  {
    "keyConditions": ["Condition 1", "Condition 2"],
    "currentMedications": ["Med 1", "Med 2"],
    "recentVisitsSummary": "A 1-2 sentence summary of the latest clinical interactions (OPD visits and IPD discharges)"
  }

  DATA:
  - Prescriptions: ${JSON.stringify(prescriptions.map(p => ({
    date: p.date,
    complaints: p.complaints,
    findings: p.findings,
    medicines: p.medicines,
    advice: p.advice
  })))}
  - Discharge Summaries: ${JSON.stringify(patient.summaries || [])}
  `;

  try {
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'meta/llama-3.1-8b-instruct', 
        messages: [
          { role: 'system', content: 'You are a JSON API. You MUST return ONLY valid JSON and absolutely no other text, markdown, or greetings.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1
      }),
      // Set a strict timeout for AI generation
      signal: AbortSignal.timeout(15000)
    });

    const data = await response.json();
    let result = data.choices?.[0]?.message?.content?.trim() || '';
    
    // Robust Extraction
    if (result.includes('```json')) {
      result = result.split('```json')[1].split('```')[0].trim();
    } else if (result.includes('```')) {
      result = result.split('```')[1].split('```')[0].trim();
    }
    
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    return jsonMatch ? jsonMatch[0] : result;
  } catch (err) {
    console.error(`❌ [AI ERROR] Patient History Background Refresh Failed:`, err.message);
    return null;
  }
}

// Helper: Calculate immediate heuristic summary (WARP SPEED)
function calculateHeuristicSummary(visits) {
  if (!visits || visits.length === 0) {
    return {
      keyConditions: ["New Patient"],
      currentMedications: ["None recorded"],
      recentVisitsSummary: "This is the patient's first clinical interaction at this facility."
    };
  }

  // Extract unique key conditions (last 3 chief complaints)
  const conditions = Array.from(new Set(
    visits.map(v => v.complaints)
      .filter(c => c && c.toLowerCase() !== 'routine checkup')
      .slice(0, 3)
  ));

  // Extract latest unique medications
  const meds = Array.from(new Set(
    visits.flatMap(v => v.medicines)
      .map(m => typeof m === 'object' ? m.name : m)
      .filter(m => m)
      .slice(0, 5)
  ));

  const lastVisitDate = new Date(visits[0].visit_date).toLocaleDateString();

  return {
    keyConditions: conditions.length > 0 ? conditions : ["General Wellness"],
    currentMedications: meds.length > 0 ? meds : ["No active prescriptions"],
    recentVisitsSummary: `Clinical history includes ${visits.length} recorded interactions. Latest visit was on ${lastVisitDate}.`
  };
}

// GET patient history
router.get('/:patientId', async (req, res) => {
  const { patientId } = req.params;

  try {
    const { data: patient, error: patErr } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single();

    if (patErr) return res.status(404).json({ error: 'Patient not found' });

    const { data: rawPrescriptions } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('patient_id', patientId)
      .order('date', { ascending: false });

    const visits = (rawPrescriptions || []).map(p => {
      let medicines = [];
      try {
        medicines = typeof p.medicines === 'string' ? JSON.parse(p.medicines) : p.medicines;
      } catch (e) {
        console.error(`⚠️ Prescription ${p.id} has malformed medicines JSON`);
      }

      return {
        visit_date: p.date || p.created_at,
        created_at: p.created_at,
        doctor: p.doctor_name,
        complaints: p.complaints,
        findings: p.findings,
        medicines: medicines || [],
        advice: p.advice,
        prescription_id: p.id
      };
    });

    // 1b. Fetch Discharge Summaries
    const { data: rawSummaries } = await supabase
      .from('discharge_summaries')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    const summaries = (rawSummaries || []).map(s => {
      const safeParse = (val) => {
        if (!val) return [];
        try { return typeof val === 'string' ? JSON.parse(val) : val; }
        catch (e) { return []; }
      };

      return {
        ...s,
        medicines: safeParse(s.medicines),
        complaints: safeParse(s.complaints),
        findings: safeParse(s.findings),
        treatment: safeParse(s.treatment),
        advice: safeParse(s.advice)
      };
    });

    // 1c. Fetch Admission Records
    const { data: rawAdmissions } = await supabase
      .from('admission_records')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    const admissions = (rawAdmissions || []).map(a => {
      const safeParse = (val) => {
        if (!val) return [];
        try { return typeof val === 'string' ? JSON.parse(val) : val; }
        catch (e) { return []; }
      };

      return {
        ...a,
        complaints: safeParse(a.complaints),
        findings: safeParse(a.findings),
        investigations: safeParse(a.investigations),
        treatment_plan: safeParse(a.treatment_plan)
      };
    });

    // 1. Fetch existing cached snapshot
    const { data: existing } = await supabase
      .from('patient_histories')
      .select('summary_text, updated_at')
      .eq('patient_id', patientId)
      .maybeSingle();

    const latestVisitDate = visits.length > 0 ? new Date(visits[0].visit_date) : new Date(0);
    const summaryUpdateDate = existing?.updated_at ? new Date(existing.updated_at) : new Date(0);

    let finalSummary;
    let needsRefresh = !existing || (latestVisitDate.getTime() > summaryUpdateDate.getTime());

    // 2. Decide what to return IMMEDIATELY
    if (existing?.summary_text) {
      try {
        finalSummary = JSON.parse(existing.summary_text);
        
        // CRITICAL FIX: If we have visits but the cache says "No previous visits found", 
        // it means the cache was generated when the patient was empty (RLS or newly added).
        // Force a refresh now that we have data.
        if (visits.length > 0 && finalSummary.recentVisitsSummary === "No previous visits found.") {
          console.log(`🔄 [REFRESH] Empty snapshot detected for ${patient.name}. Forcing AI re-summary.`);
          needsRefresh = true;
        }
      } catch (e) {
        finalSummary = calculateHeuristicSummary(visits);
        needsRefresh = true; 
      }
    } else {
      finalSummary = calculateHeuristicSummary(visits);
    }

    // 3. Trigger Background Refresh (Non-Blocking)
    if (needsRefresh) {
      console.log(`⚡ [WARP SPEED] Triggering background AI refresh for ${patient.name}...`);
      // Attach summaries for AI context
      const patientWithSummaries = { ...patient, summaries };
      // Start background task but do NOT await it
      generatePatientSummary(patientWithSummaries, rawPrescriptions || []).then(async (generatedJson) => {
        if (generatedJson) {
           await supabase.from('patient_histories').upsert({
             patient_id: patientId,
             summary_text: generatedJson,
             updated_at: new Date()
           }, { onConflict: 'patient_id' });
           console.log(`✅ [AI CACHE] Refreshed snapshot for ${patient.name}.`);
        }
      });
    }

    res.json({ patient, visits, summaries, admissions, summary: finalSummary });

  } catch (err) {
    console.error('❌ [SERVER ERROR] Patient History:', err);
    res.status(500).json({ error: 'Internal clinical systems error' });
  }
});

module.exports = router;
