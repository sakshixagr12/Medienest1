export type DepartmentTemplate = {
  name: string;
  categories: {
    categoryName: string;
    findings: string[];
  }[];
};

export const EXAMINATION_TEMPLATES: DepartmentTemplate[] = [
  {
    name: "Medicine",
    categories: [
      {
        categoryName: "Vitals",
        findings: ["Vitals Stable", "Afebrile", "Febrile", "Tachycardia", "Bradycardia", "Tachypnea", "Normotensive", "Hypertensive", "Hypotensive", "Maintaining SpO2 on Room Air"],
      },
      {
        categoryName: "General",
        findings: ["Conscious", "Oriented", "Alert", "Lethargic", "No Pallor", "Pallor Present", "No Icterus", "Icterus Present", "No Cyanosis", "No Clubbing", "No Lymphadenopathy", "No Pedal Edema", "Pedal Edema Present", "Well Hydrated", "Dehydrated"],
      },
      {
        categoryName: "Cardiovascular (CVS)",
        findings: ["CVS Normal", "S1 S2 Heard", "No Murmur", "Murmur Present", "Regular Rhythm", "Irregular Rhythm", "JVP Not Elevated", "Normal Peripheral Pulses"],
      },
      {
        categoryName: "Respiratory (RS)",
        findings: ["RS Normal", "Bilateral Vesicular Breath Sounds (NVBS)", "No Added Sounds", "Bilateral Crepitations", "Basal Crepitations", "Rhonchi Present", "Wheeze Present", "Decreased Air Entry"],
      },
      {
        categoryName: "Gastrointestinal (PA)",
        findings: ["Abdomen Soft", "Non-Tender", "Tender", "No Organomegaly", "Hepatomegaly", "Splenomegaly", "Bowel Sounds Present", "No Distension"],
      },
      {
        categoryName: "Central Nervous System (CNS)",
        findings: ["CNS Normal", "Higher Mental Functions Intact", "No Focal Neurological Deficit (FND)", "Cranial Nerves Intact", "Motor System Normal", "Sensory System Normal", "Plantar Flexor", "Reflexes Normal", "Pupils Bilaterally Equal & Reactive to Light (PEARL)"],
      },
    ],
  },
  {
    name: "Orthopedics",
    categories: [
      {
        categoryName: "General",
        findings: ["Conscious", "Oriented", "Vitals Stable", "Afebrile"],
      },
      {
        categoryName: "Local Examination",
        findings: ["Dressing Clean and Intact", "Dressing Soaked", "Wound Healthy", "Wound Gaping", "No Active Bleeding", "Swelling Present", "Deformity Present", "Tenderness Present", "Crepitus Felt", "Range of Motion (ROM) Restricted", "ROM Full"],
      },
      {
        categoryName: "Neurovascular Status",
        findings: ["Distal Pulses Palpable", "No Neurovascular Deficit", "Capillary Refill Normal (<2s)", "Sensory Intact", "Motor Intact"],
      },
      {
        categoryName: "Implants & Casts",
        findings: ["Cast Intact", "Splint in Situ", "External Fixator Stable", "Pin Tracts Clean"],
      }
    ],
  },
  {
    name: "Pediatrics",
    categories: [
      {
        categoryName: "General",
        findings: ["Active", "Playful", "Lethargic", "Irritable", "Feeding Well", "Poor Feeding", "Well Hydrated", "Signs of Dehydration Present", "Afebrile", "Febrile"],
      },
      {
        categoryName: "Respiratory",
        findings: ["No Respiratory Distress", "Chest Clear", "Tachypnea", "Subcostal Retractions", "Intercostal Retractions", "Nasal Flaring", "Grunting", "Crepitations", "Wheeze"],
      },
      {
        categoryName: "Systemic",
        findings: ["CVS Normal", "Abdomen Soft", "Bowel Sounds Present", "Anterior Fontanelle Normal", "Tone Normal", "Reflexes Normal"],
      },
      {
        categoryName: "Anthropometry",
        findings: ["Weight Appropriate for Age", "Failure to Thrive", "Normal Head Circumference"],
      }
    ],
  },
  {
    name: "Surgery",
    categories: [
      {
        categoryName: "General",
        findings: ["Conscious", "Oriented", "Afebrile", "Vitals Stable"],
      },
      {
        categoryName: "Surgical Site / Local",
        findings: ["Wound Healthy", "Primary Intention Healing", "No Discharge", "Serous Discharge", "Purulent Discharge", "No Active Bleeding", "Dressing Clean and Dry", "Sutures/Staples Intact", "Erythema Present", "Induration Present"],
      },
      {
        categoryName: "Drains & Tubes",
        findings: ["Drain Intact", "Minimal Drain Output", "Catheter in Situ", "Ryles Tube in Situ", "Foley Catheter Patent"],
      },
      {
        categoryName: "Abdomen",
        findings: ["Soft", "Non-Tender", "Guarding Present", "Rigidity Present", "Bowel Sounds Present", "Bowel Sounds Sluggish", "Flatus Passed", "Stool Passed"],
      }
    ],
  },
  {
    name: "Gynecology & Obstetrics",
    categories: [
      {
        categoryName: "General",
        findings: ["Conscious", "Oriented", "Vitals Stable", "Afebrile", "No Pallor", "No Edema"],
      },
      {
        categoryName: "Obstetric Examination (P/A)",
        findings: ["Uterus Relaxed", "Uterus Contracted", "Fetal Heart Sounds (FHS) Good", "Fundal Height Corresponds to Dates", "Cephalic Presentation", "Breech Presentation", "Adequate Liquor"],
      },
      {
        categoryName: "Local Examination (P/V)",
        findings: ["Os Closed", "Os Open", "No Active Bleeding", "Bleeding Present", "Discharge Present", "Cervix Healthy", "Vaginal Vault Healthy"],
      },
      {
        categoryName: "Post-Operative",
        findings: ["Lochia Rubra", "Lochia Serosa", "Lochia Alba", "Episiotomy Wound Healthy", "LSCS Wound Healthy", "Breasts Soft", "Lactation Established"],
      }
    ],
  }
];
