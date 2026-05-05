/**
 * ClinicalVault - A hard-rules engine for medicinal logic.
 * This validator detects Clinical Anti-Patterns and Functional Redundancy.
 */

const FUNCTIONAL_GROUPS = {
  GI_UP: "Bowel Stimulant (Increases motility)",
  GI_DOWN: "Anti-Diarrheal (Decreases motility)",
  GI_SOFT: "Stool Softener / Bulk Fiber",
  PAIN: "Pain Relief",
  INFLAMMATION: "Anti-Inflammatory",
  ACID_CONTROL: "Acidity / Antacid",
  INFECTION: "Antibiotic / Anti-Infective",
  LOCAL_CARE: "Topical / Local Care"
};

const CONTRADICTORY_PATTERNS = [
  { pair: ["GI_UP", "GI_DOWN"], message: "Opposite mechanism detected: Promoting bowel movement while simultaneously stopping it." },
  { pair: ["GI_SOFT", "GI_DOWN"], message: "Conflicting intent: Softening stool while attempting to stop diarrhea." }
];

const DRUG_REGISTRY = {
  "dulcolax": "GI_UP",
  "bisacodyl": "GI_UP",
  "laxoberal": "GI_UP",
  "sodium picosulfate": "GI_UP",
  "loperamide": "GI_DOWN",
  "lomotil": "GI_DOWN",
  "pectolax": "GI_SOFT",
  "psyllium": "GI_SOFT",
  "isabgol": "GI_SOFT",
  "lactulose": "GI_SOFT",
  "paracetamol": "PAIN",
  "dolo 650": "PAIN",
  "brufen": "INFLAMMATION",
  "ibuprofen": "INFLAMMATION",
  "diclofenac": "INFLAMMATION",
  "pantoprazole": "ACID_CONTROL",
  "ranitidine": "ACID_CONTROL",
  "sitz bath": "LOCAL_CARE",
  "lidocaine": "LOCAL_CARE"
};

/**
 * Validates a list of suggested care items.
 * suggestedMeds: Array of { name, type, tier }
 */
function validatePrescription(suggestedMeds, cc = "", findings = "", severity = "", diagnosis = "") {
  const flags = [];
  let validMeds = [];
  
  const ctx = (cc + " " + findings + " " + diagnosis).toLowerCase();

  // 1. RED FLAG BLOCK (Safety Priority 1)
  if (severity.toLowerCase() === 'red_flag') {
    flags.push("🚨 RED FLAG DETECTED: Suggested referral/urgent care only. No outpatient medications advised.");
    return { validMeds: [], flags }; // Early exit for safety
  }

  // 2. GASTROENTERITIS CHECK (Safety Priority 2)
  const isGastro = ctx.includes("diarrhea") || ctx.includes("vomiting") || ctx.includes("gastro") || ctx.includes("stomach flu");
  const hasORS = suggestedMeds.some(m => m.name.toUpperCase().includes("ORS") || m.name.toUpperCase().includes("ELECTROLYTE"));
  
  if (isGastro && !hasORS) {
    validMeds.push({ name: "ORS / Oral Rehydration Solution", type: "non-drug", tier: "MUST" });
    flags.push("🛡️ SAFETY RULE: Added mandatory ORS for gastroenteritis management.");
  }

  // 3. ANTIBIOTIC / ANTIVIRAL BLOCK (Safety Priority 3)
  const isViral = ctx.includes("viral") || ctx.includes("flu") || ctx.includes("cold") || ctx.includes("cough");
  const isDentalMild = (ctx.includes("tooth") || ctx.includes("dental") || ctx.includes("gum")) && 
                       !(ctx.includes("abscess") || ctx.includes("swelling") || ctx.includes("infection"));

  const filteredMeds = suggestedMeds.filter(m => {
    const fGroup = getFunctionalGroup(m.name);
    const isAntibiotic = fGroup === "INFECTION";
    
    if (isAntibiotic && isViral) {
      flags.push(`🛡️ SAFETY BLOCK: Removed ${m.name} (Antibiotics not advised for viral patterns).`);
      return false;
    }
    if (isAntibiotic && isDentalMild) {
      flags.push(`🛡️ SAFETY BLOCK: Removed ${m.name} (Antibiotics not advised for non-infectious dental pain).`);
      return false;
    }
    return true;
  });

  // 4. PRUNING & PRIORITIZATION (MUST -> OPTIONAL, Limit 3)
  const mustMeds = filteredMeds.filter(m => (m.tier || '').toUpperCase() === 'MUST');
  const optionalMeds = filteredMeds.filter(m => (m.tier || '').toUpperCase() === 'OPTIONAL' || (m.tier || '').toUpperCase() === 'SUPPORTIVE');

  // Add MUST items (that aren't already added by safety rules like ORS)
  mustMeds.forEach(m => {
    if (validMeds.length < 3 && !validMeds.some(v => v.name.toLowerCase() === m.name.toLowerCase())) {
       validMeds.push(m);
    }
  });

  const currentFunctionalGroups = new Set(validMeds.map(m => getFunctionalGroup(m.name)));

  // Add OPTIONAL items (Fill up to 3 total)
  for (const m of optionalMeds) {
    if (validMeds.length >= 3) break;
    const fGroup = getFunctionalGroup(m.name);
    
    if (!currentFunctionalGroups.has(fGroup)) {
      validMeds.push(m);
      currentFunctionalGroups.add(fGroup);
    } else {
      flags.push(`PRUNED: Redundant ${m.name} removed to maintain minimal 3-item management.`);
    }
  }

  return { validMeds, flags };
}

function getFunctionalGroup(name) {
  const key = name.toLowerCase().trim();
  const matchedKey = Object.keys(DRUG_REGISTRY).find(k => key.includes(k));
  return matchedKey ? DRUG_REGISTRY[matchedKey] : "UNKNOWN";
}

module.exports = {
  validatePrescription,
  FUNCTIONAL_GROUPS
};
