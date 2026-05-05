require('dotenv').config();
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceRole);

const CLASS_TO_DRUG_MAP = {
    "bronchodilator": { meds: ["salbutamol", "ipratropium"], domain: "resp" },
    "antibiotic_r": { meds: ["amoxicillin", "azithromycin"], domain: "resp" },
    "expectorant": { meds: ["ambroxol"], domain: "resp" },
    "antitussive": { meds: ["dextromethorphan"], domain: "resp" }, // PERMANENT REMOVAL OF CODEINE
    "decongestant": { meds: ["phenylephrine"], domain: "resp" },
    "steroid_inhaler": { meds: ["fluticasone", "budesonide"], domain: "resp" },
    "nitrate": { meds: ["isosorbide dinitrate"], domain: "cardio" },
    "diuretic": { meds: ["furosemide", "spironolactone"], domain: "cardio" },
    "statin": { meds: ["atorvastatin"], domain: "cardio" },
    "beta_blocker": { meds: ["metoprolol", "propranolol"], domain: "cardio" },
    "antithyroid": { meds: ["methimazole", "carbimazole"], domain: "general" },
    "ppi": { meds: ["pantoprazole", "omeprazole"], domain: "gi" },
    "antispasmodic": { meds: ["dicyclomine", "hyoscine"], domain: "gi" },
    "antiemetic": { meds: ["domperidone", "ondansetron"], domain: "gi" },
    "prokinetic": { meds: ["itopride", "domperidone"], domain: "gi" },
    "laxative": { meds: ["lactulose", "bisacodyl"], domain: "gi" },
    "probiotic": { meds: ["lactobacillus"], domain: "gi" },
    "ors": { meds: ["ors"], domain: "gi" },
    "antacid": { meds: ["magnesium hydroxide", "aluminum hydroxide"], domain: "gi" },
    "retinoid": { meds: ["adapalene", "benzoyl peroxide"], domain: "derm" },
    "antibiotic_acne": { meds: ["doxycycline"], domain: "derm" },
    "antifungal": { meds: ["clotrimazole", "fluconazole"], domain: "derm" },
    "steroid_topical": { meds: ["betamethasone", "clobetasol"], domain: "derm" },
    "antiparasitic": { meds: ["albendazole", "permethrin"], domain: "derm" },
    "antibiotic_u": { meds: ["nitrofurantoin"], domain: "uro" },
    "alpha_blocker": { meds: ["tamsulosin"], domain: "uro" },
    "antipyretic": { meds: ["paracetamol"], domain: "general" },
    "analgesic": { meds: ["paracetamol"], domain: "general" },
    "antihistamine": { meds: ["cetirizine", "levocetirizine"], domain: "general" },
    "nsaid": { meds: ["aceclofenac", "diclofenac"], domain: "general" },
    "nerve_pain": { meds: ["pregabalin", "gabapentin"], domain: "neuro" },
    "vitamin": { meds: ["folic acid", "zincovit"], domain: "general" },
    "neurovitamin": { meds: ["methylcobalamin"], domain: "general" },
    "thyroxine": { meds: ["levothyroxine"], domain: "general" },
    "antidiabetic": { meds: ["metformin", "glimepiride"], domain: "general" },
    "calcium": { meds: ["calcium carbonate"], domain: "general" },
    "hormonal": { meds: ["medroxyprogesterone"], domain: "general" },
    "antivertigo": { meds: ["betahistine"], domain: "general" },
    "antibiotic": { meds: ["amoxicillin-clavulanic acid", "azithromycin"], domain: "general" }
};

const CLASS_ALIAS_MAP = {
    "antacids": "ppi",
    "acid_suppressant": "ppi",
    "painkiller": "analgesic",
    "fever": "antipyretic",
    "cough_syrup": "antitussive",
    "anti_allergy": "antihistamine",
    "anti_allergic": "antihistamine",
    "inhaler": "bronchodilator"
};

const GLOBAL_AVOID = ["codeine"];

const AGE_SAFETY_MAP = {
    "PEDS_CRITICAL": { age: 12, block: ["codeine", "doxycycline", "fluoroquinolones", "nsaid"] },
    "INFANT_STRICT": { age: 2, block: ["antihistamine", "antitussive"] },
    "GERIATRIC": { age: 65, flag: ["nsaid", "benzodiazepine"] }
};

const PREGNANCY_BLOCK_LIST = ["doxycycline", "nsaid", "codeine", "fluconazole", "methotrexate"];

const DOSAGE_MASTER = {
    "antipyretic": { dose: "500mg", freq: "1 tab tid (after food)", dur: "3 days", route: "Oral" },
    "analgesic": { dose: "500mg", freq: "1 tab tid (after food)", dur: "3 days", route: "Oral" },
    "antihistamine": { dose: "10mg", freq: "1 tab od (at bedtime)", dur: "5 days", route: "Oral" },
    "antitussive": { dose: "10ml", freq: "10ml bid", dur: "5 days", route: "Oral" },
    "ppi": { dose: "40mg", freq: "1 tab od (empty stomach)", dur: "7 days", route: "Oral" },
    "ors": { dose: "1 sachet", freq: "Mix in 1L water, sip throughout day", dur: "1-2 days", route: "Oral" },
    "antibiotic_u": { dose: "100mg", freq: "1 cap bid", dur: "5 days", route: "Oral" },
    "antidiabetic": { dose: "500mg", freq: "1 tab od (with dinner)", dur: "30 days", route: "Oral" },
    "antithyroid": { dose: "5mg", freq: "1 tab od", dur: "30 days", route: "Oral" },
    "calcium": { dose: "500mg", freq: "1 tab od", dur: "30 days", route: "Oral" },
    "nerve_pain": { dose: "75mg", freq: "1 cap od (at bedtime)", dur: "10 days", route: "Oral" },
    "hormonal": { dose: "10mg", freq: "1 tab od", dur: "10 days", route: "Oral" }
};

const CATEGORY_RED_FLAGS = {
    "resp": ["Severe breathlessness", "Cyanosis (bluish skin)", "Inability to speak in full sentences"],
    "gi": ["Blood in stool", "Persistent vomiting", "Severe abdominal tenderness/stiffness", "Sudden abdominal pain related to alcohol"],
    "neuro": ["Sudden facial droop", "Slurred speech", "Fainting or seizures", "Sudden vision loss", "Sudden weakness", "Sudden numbness"],
    "general": ["High fever with stiff neck", "Persistent fever > 3 days", "Rapidly spreading rash", "Unexplained weight loss", "Confusion"]
};

const PROTOCOL_MASTER = {
    "mi": { must: [], optional: [], avoid: [], sev: "emergency", tag: "Potential Myocardial Infarction" },
    "stroke": { must: [], optional: [], avoid: [], sev: "emergency", tag: "Potential Stroke" },
    "meningitis": { must: [], optional: [], avoid: [], sev: "emergency", tag: "Potential Meningitis" },
    "anaphylaxis": { must: [], optional: [], avoid: [], sev: "emergency", tag: "Anaphylaxis" },
    "urti": { must: ["antipyretic"], optional: ["antihistamine", "antitussive"], avoid: ["antibiotic", "nsaid"], sev: "mild", tag: "URTI" },
    "viral_fever": { must: ["antipyretic"], optional: ["analgesic"], avoid: ["antibiotic"], sev: "mild", tag: "Viral Fever" },
    "dengue": { must: ["antipyretic"], optional: [], avoid: ["nsaid", "anticoagulant"], sev: "moderate", tag: "Dengue" },
    "typhoid": { must: ["antipyretic"], optional: ["antibiotic"], avoid: [], sev: "moderate", tag: "Typhoid" },
    "cough": { must: ["antitussive"], optional: ["antihistamine"], avoid: ["antibiotic"], sev: "mild", tag: "Acute Cough" },
    "asthma": { must: ["bronchodilator"], optional: ["steroid_inhaler"], avoid: ["antihistamine"], sev: "moderate", tag: "Asthma" },
    "gastritis": { must: ["ppi"], optional: ["antacid"], avoid: ["nsaid"], sev: "mild", tag: "Gastritis" },
    "gerd": { must: ["ppi"], optional: ["prokinetic"], avoid: ["laxative"], sev: "mild", tag: "GERD" },
    "uti": { must: ["antibiotic_u"], optional: ["analgesic"], avoid: [], sev: "moderate", tag: "UTI" },
    "diabetes": { must: ["antidiabetic"], optional: ["statin"], avoid: [], sev: "moderate", tag: "Diabetes" },
    "gastroenteritis": { must: ["ors", "probiotic"], optional: ["antiemetic"], avoid: ["laxative", "ppi", "nsaid"], sev: "moderate", tag: "Gastroenteritis" },
    "diarrhea": { must: ["ors"], optional: ["probiotic"], avoid: ["laxative", "nsaid"], sev: "mild", tag: "Diarrhea" },
    "rheumatoid": { must: ["analgesic"], optional: ["nsaid"], avoid: [], sev: "moderate", tag: "Rheumatoid Arthritis" },
    "sciatica": { must: ["nerve_pain"], optional: ["analgesic"], avoid: ["antihistamine", "antiemetic"], sev: "moderate", tag: "Sciatica" },
    "hyperthyroid": { must: ["antithyroid"], optional: ["beta_blocker"], avoid: [], sev: "moderate", tag: "Hyperthyroid" },
    "anemia": { must: ["vitamin"], optional: [], avoid: [], sev: "moderate", tag: "Anemia" },
    "fungal": { must: ["antifungal"], optional: [], avoid: [], sev: "mild", tag: "Fungal Infection" },
    "pcos": { must: ["hormonal"], optional: [], avoid: ["antihistamine"], sev: "mild", tag: "PCOS" },
    "tonsillitis": { must: ["antipyretic"], optional: ["antibiotic", "analgesic"], avoid: [], sev: "mild", tag: "Tonsillitis" },
    "pharyngitis": { must: ["analgesic"], optional: ["antipyretic"], avoid: ["bronchodilator"], sev: "mild", tag: "Pharyngitis" }
};

const SYMPTOM_MATCHER = {
    "domperidone": ["vomiting", "nausea", "gastritis", "acidity"],
    "ondansetron": ["vomiting", "nausea"],
    "antitussive": ["cough"],
    "expectorant": ["cough", "sputum"],
    "antihistamine": ["sneezing", "runny", "itchy", "rash", "allergy", "eye"],
    "laxative": ["constipation", "hard stool"],
    "analgesic": ["pain", "sore", "ache", "fever", "cramp", "stiff"],
    "antipyretic": ["fever", "chills", "high temp", "ache", "sore"],
    "vitamin": ["fatigue", "weakness", "hair loss", "deficiency", "tired", "pallor", "pregnancy", "missed period"],
    "antifungal": ["fungal", "itch", "skin", "rash", "ringworm"],
    "ppi": ["acidity", "burning", "heartburn", "gerd", "bloat", "sour", "gastritis"],
    "antacid": ["acidity", "burning", "heartburn", "gerd", "bloat", "sour", "gastritis"]
};

const INTERACTION_RULES = [
    { pair: ["nsaid", "analgesic"], action: "block_nsaid", reason: "Overlapping analgesia; prioritize Paracetamol safety." },
    { pair: ["antihistamine", "bronchodilator"], action: "block_antihistamine", reason: "Antihistamines can thicken secretions in asthma." },
    { pair: ["ppi", "antacid"], action: "none", reason: "Common clinical combination for rapid relief." }
];

const DIAGNOSIS_WARNINGS = {
    "uti": ["Persistent high fever > 102°F", "Severe flank/back pain", "Difficulty/Inability to pass urine"],
    "gerd": ["Difficulty swallowing (Dysphagia)", "Unexplained weight loss", "Vomiting blood or black stools"],
    "asthma": ["Inability to speak in full sentences", "Cyanosis (bluish tint to lips/nails)", "Silent chest (no breath sounds)"],
    "gi": ["Severe abdominal rigidity/guarding", "Inability to pass gas/stools", "Persistent vomiting with dehydration"],
    "general": ["High fever with stiff neck/confusion", "Rapidly spreading purple rash", "Sudden breathlessness or chest pain"]
};

const CATEGORY_ALLOWED_DOMAINS = {
    "cardio": ["cardio", "general"],
    "neuro": ["general"],
    "resp": ["resp", "general"],
    "gi": ["gi", "general"],
    "derm": ["derm", "general", "resp"],
    "uro": ["uro", "general", "resp"],
    "general": ["general", "gi", "resp", "uro"]
};

function normalizeClass(cls) {
    if (!cls) return null;
    const cleaned = cls.toLowerCase().trim().replace(/\s+/g, "_");
    // direct match
    if (CLASS_TO_DRUG_MAP[cleaned]) return cleaned;
    // alias match
    if (CLASS_ALIAS_MAP[cleaned]) return CLASS_ALIAS_MAP[cleaned];
    return null;
}

function rankDiagnosis(list) {
    const common = ["viral", "urti", "gerd", "uti", "gastritis", "diarrhea", "gastroenteritis"];
    return list.sort((a, b) => 
        (common.includes(b.toLowerCase()) ? 1 : 0) - (common.includes(a.toLowerCase()) ? 1 : 0)
    );
}

function applyProtocol(classes, protocol) {
    if (!protocol) return classes;
    // Rule: Must items go first, then AI items
    const must = protocol.must || [];
    const combined = [...must, ...classes];
    return [...new Set(combined)];
}

function applyAvoid(classes, protocol) {
    if (!protocol?.avoid) return classes;
    return classes.filter(c => !protocol.avoid.includes(c.toLowerCase()));
}

function contextGuard(context, classes, cc, findings, diagnosis) {
    const text = (diagnosis + " " + cc + " " + (findings || "")).toLowerCase();
    let emergencyReason = null;
    let suggestions = null;

    // 1. CHRONIC SERIOUS CLUSTER
    if (text.includes("weight loss") && (text.includes("cough") || text.includes("night sweat") || text.includes("sweat"))) {
        return { classes: [], forcedSeverity: "emergency", forcedReason: "Potential TB/Malignancy - Urgent Referral Required." };
    }

    // 2. PREGNANCY / ECTOPIC GUARD
    if (context.is_pregnant || text.includes("missed period") || text.includes("pregnant")) {
        if (text.includes("pain") && (text.includes("dizz") || text.includes("faint"))) {
            return { classes: [], forcedSeverity: "emergency", forcedReason: "Potential Ectopic Pregnancy - Immediate ER Referral." };
        }
        // Pregnancy Protocol: Vitamin only
        return { classes: ["vitamin"], forcedSeverity: "moderate" };
    }

    // 3. MENTAL HEALTH LOCK
    if (text.includes("anxiety") || text.includes("depression") || text.includes("mental")) {
        return { classes: [], forcedSeverity: "moderate", forcedReason: "Mental Health Counseling/Psychiatry referral prioritized." };
    }

    return { classes };
}

function validateBySymptoms(cc, findings, recommendations) {
    const combined = (cc + " " + (findings || "")).toLowerCase();
    return recommendations.filter(r => {
        const triggers = SYMPTOM_MATCHER[r.drug.toLowerCase()] || SYMPTOM_MATCHER[r.class.toLowerCase()];
        if (!triggers) return true; // No specific symp validation for this drug
        return triggers.some(t => combined.includes(t));
    });
}

function safetyLayer(diagnosis, recommendations) {
    let currentMeds = [...recommendations];
    
    // 1. INTERACTION ENGINE (Alpha)
    for (const rule of INTERACTION_RULES) {
        const foundClasses = currentMeds.map(r => r.class.toLowerCase());
        const hasPair = rule.pair.every(p => foundClasses.includes(p));
        
        if (hasPair) {
            if (rule.action === "block_nsaid") {
                currentMeds = currentMeds.filter(r => r.class !== "nsaid");
            } else if (rule.action === "block_antihistamine") {
                currentMeds = currentMeds.filter(r => r.class !== "antihistamine");
            }
        }
    }

    // 2. ABSOLUTE CONTRAINDICATIONS
    if (diagnosis.includes("diarrhea") || diagnosis.includes("gastroenteritis")) {
        currentMeds = currentMeds.filter(r => r.class !== "nsaid" && r.class !== "ppi" && r.class !== "laxative");
    }
    
    if (diagnosis.includes("asthma")) {
        currentMeds = currentMeds.filter(r => r.class !== "antihistamine");
    }

    return currentMeds;
}

function getWarnings(diagnosis, category) {
    let warnings = [];
    const diag = diagnosis.toLowerCase();
    
    // Precise Diagnosis-specific matching
    if (diag.includes("uti")) warnings.push(...DIAGNOSIS_WARNINGS.uti);
    else if (diag.includes("gerd") || diag.includes("gastritis")) warnings.push(...DIAGNOSIS_WARNINGS.gerd);
    else if (diag.includes("asthma") || diag.includes("bronch")) warnings.push(...DIAGNOSIS_WARNINGS.asthma);
    else if (diag.includes("gastro") || diag.includes("diarrhea") || diag.includes("vomiting")) warnings.push(...DIAGNOSIS_WARNINGS.gi);
    
    // Safe Fallback: General only
    if (warnings.length === 0) {
        warnings = CATEGORY_RED_FLAGS.general;
    }

    return [...new Set(warnings)];
}

function parseClinicalJson(content) {
    try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON");
        return JSON.parse(jsonMatch[0].replace(/,\s*([}\]])/g, '$1'));
    } catch (e) {
        return { severity: "moderate", category: "general", probable_diagnosis: "Clinical Evaluation Required", required_classes: [], advice: ["Follow clinical protocols."] };
    }
}

async function suggestClinicalPath(cc, findings, context = {}) {
    try {
        const { age, gender, specialty, weight, is_pregnant, is_lactating } = context;

        // --- STEP 0: PRE-AI RED FLAG HARD-TRIAGE ---
        let forcedEmergency = false;
        let emergencyReason = "";
        const combinedText = (cc + " " + (findings || "")).toLowerCase();
        
        for (const [domain, flags] of Object.entries(CATEGORY_RED_FLAGS)) {
            for (const flag of flags) {
                if (combinedText.includes(flag.toLowerCase().trim())) {
                    forcedEmergency = true;
                    emergencyReason = `RED FLAG DETECTED: Potential ${domain} emergency.`;
                    break;
                }
            }
            if (forcedEmergency) break;
        }

        const systemPrompt = `You are an elite clinical engine. Detect red flags.
        Return required_classes ONLY from: antipyretic, analgesic, antibiotic, antibiotic_r, antitussive, bronchodilator, ppi, antihistamine, antiemetic, ors, antifungal, laxative, nsaid.
        JSON ONLY: { "severity": "mild|moderate|emergency", "category": "cardio|neuro|resp|gi|derm|uro|general", "probable_diagnosis": "", "differentials": [], "investigations": { "primary": [], "secondary": [] }, "required_classes": [], "advice": ["item1", "item2"], "confidence": 0-1 }`;

        const aiResponse = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${process.env.NVIDIA_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "meta/llama-3.1-8b-instruct",
                messages: [{ role: "system", content: systemPrompt }, { role: "user", content: `Case: ${age}y ${gender} CC: ${cc} Findings: ${findings}` }],
                temperature: 0.1
            })
        });

        const aiData = await aiResponse.json();
        const clinicalIntent = parseClinicalJson(aiData.choices?.[0]?.message?.content || "");

        // --- STEP 1: RANK DIAGNOSIS & REASONING ---
        const dxList = [clinicalIntent.probable_diagnosis, ...(clinicalIntent.differentials || [])];
        const rankedDx = rankDiagnosis(dxList);
        let diagnosis = (rankedDx[0] || "Evaluation Required").toLowerCase();
        let severity = forcedEmergency ? "emergency" : clinicalIntent.severity || "moderate";
        let category = clinicalIntent.category || "general";

        // --- STEP 2: PROTOCOL AUGMENTATION ---
        let classes = (clinicalIntent.required_classes || []).map(normalizeClass).filter(Boolean);
        let activeTags = [];

        Object.keys(PROTOCOL_MASTER).forEach(key => {
            const re = new RegExp(`\\b${key}\\b`, 'i');
            if (re.test(diagnosis)) {
                const p = PROTOCOL_MASTER[key];
                activeTags.push(p.tag);
                if (severity !== 'emergency') severity = p.sev;
                classes = applyProtocol(classes, p);
                classes = applyAvoid(classes, p);
            }
        });

        // --- STEP 3: CONTEXT GUARD (HARD SHIELD) ---
        const guard = contextGuard(context, classes, cc, findings, diagnosis);
        classes = guard.classes;
        if (guard.forcedSeverity) severity = guard.forcedSeverity;
        if (guard.forcedReason) {
            diagnosis = guard.forcedReason;
            emergencyReason = guard.forcedReason;
        }

        // --- STEP 4: DOMAIN FILTERING ---
        const allowed = CATEGORY_ALLOWED_DOMAINS[category] || CATEGORY_ALLOWED_DOMAINS["general"];
        classes = classes.filter(c => {
            const meta = CLASS_TO_DRUG_MAP[c.toLowerCase().trim()];
            return !meta || allowed.includes(meta.domain);
        });

        // --- STEP 5: DRUG MAPPING & DOSAGE ENGINE ---
        let recommendations = [];
        const usedGenerics = new Set();
        
        const safetyBlocks = [];
        if (age < 12) safetyBlocks.push(...AGE_SAFETY_MAP.PEDS_CRITICAL.block);
        if (age < 2) safetyBlocks.push(...AGE_SAFETY_MAP.INFANT_STRICT.block);
        if (is_pregnant) safetyBlocks.push(...PREGNANCY_BLOCK_LIST);

        for (const intentKey of classes) {
            if (safetyBlocks.includes(intentKey.toLowerCase())) continue;
            const meta = CLASS_TO_DRUG_MAP[intentKey.toLowerCase().trim()];
            if (meta) {
                const g = meta.meds[0]; 
                if (GLOBAL_AVOID.includes(g.toLowerCase()) || safetyBlocks.includes(g.toLowerCase())) continue;

                if (!usedGenerics.has(g.toLowerCase())) {
                    usedGenerics.add(g.toLowerCase());
                    const { data: brands } = await supabase.rpc('search_medicines_v2', { search_term: g });
                    const safeBrands = (brands || []).filter(b => !/(inj|iv|im)/i.test((b.name + (b.dosage_form || ''))));
                    
                    if (safeBrands.length > 0) {
                        const doseInfo = DOSAGE_MASTER[intentKey.toLowerCase()] || { dose: "As directed", freq: "od", dur: "3 days", route: "Oral" };
                        recommendations.push({ 
                            drug: g, 
                            class: intentKey,
                            dosage: `${doseInfo.dose} — ${doseInfo.freq} — ${doseInfo.dur} — ${doseInfo.route}`,
                            instructions: doseInfo.note || "Take as prescribed.",
                            brands: safeBrands.slice(0, 3).map(b => ({ id: b.id, name: b.name, price: b.price || 'N/A', emoji: '💊' })) 
                        });
                    }
                }
            }
        }

        // --- STEP 6: SYMPTOM VALIDATION ---
        recommendations = validateBySymptoms(cc, findings, recommendations);

        // --- STEP 7: SAFETY LAYER (INTERACTIONS) ---
        recommendations = safetyLayer(diagnosis, recommendations);

        // --- STEP 8: ABSOLUTE EMERGENCY WIPE ---
        if (severity === 'emergency') {
            recommendations = [];
            diagnosis = emergencyReason || diagnosis || "Serious condition — requires urgent evaluation";
        }

        // --- STEP 9: WARNING ENGINE ---
        const finalRecommendations = recommendations.slice(0, 3);
        const adviceList = Array.isArray(clinicalIntent.advice) ? clinicalIntent.advice : [clinicalIntent.advice || "Follow clinical protocols."];
        const finalAdvice = adviceList.map(a => `• ${a.trim()}`);
        if (activeTags.length > 0) finalAdvice.unshift(`• PROTOCOL: ${activeTags.join(' | ')}`);
        
        const warnings = getWarnings(diagnosis, category);
        finalAdvice.push("--- WARNING SIGNS (Return Immediately if): ---");
        warnings.forEach(w => finalAdvice.push(`⚠️ ${w}`));

        return { 
            probable_diagnosis: diagnosis, 
            recommendations: finalRecommendations, 
            advice: finalAdvice.join('\n'), 
            differentials: clinicalIntent.differentials || [], 
            investigations: clinicalIntent.investigations || { primary: [], secondary: [] }, 
            severity: severity, 
            confidence: clinicalIntent.confidence || 0 
        };
    } catch (err) { return { error: err.message }; }
}

router.post('/suggest', async (req, res) => {
    const { cc, findings, age, gender, specialty, weight, is_pregnant, is_lactating } = req.body;
    
    // Tier 6.0: Pass extended clinical context
    const suggestions = await suggestClinicalPath(cc, findings, { 
        age: parseInt(age) || 30, 
        gender: gender || 'M', 
        specialty,
        weight: parseFloat(weight) || 70.0,
        is_pregnant: !!is_pregnant,
        is_lactating: !!is_lactating
    });

    // AUDIT LOG (Simulated for local trace)
    console.log(`[AUDIT] CASE: ${age}y ${gender} CC: ${cc} DX: ${suggestions.probable_diagnosis}`);

    res.json({ success: true, suggestions });
});

module.exports = router;
module.exports.suggestClinicalPath = suggestClinicalPath;
