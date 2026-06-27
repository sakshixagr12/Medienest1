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
        categoryName: "General",
        findings: ["Conscious", "Oriented", "Afebrile", "Vitals Stable"],
      },
      {
        categoryName: "Systemic",
        findings: ["CVS Normal", "RS Normal", "CNS Normal", "Abdomen Soft"],
      },
    ],
  },
  {
    name: "Orthopedics",
    categories: [
      {
        categoryName: "General",
        findings: ["Dressing Clean", "Pain Controlled", "Distal Pulses Present", "No Neurovascular Deficit"],
      },
    ],
  },
  {
    name: "Pediatrics",
    categories: [
      {
        categoryName: "General",
        findings: ["Active", "Feeding Well", "Well Hydrated", "No Respiratory Distress"],
      },
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
        categoryName: "Surgical Site",
        findings: ["Wound Healthy", "No Active Bleeding", "Drain Intact", "Dressing Clean"],
      },
    ],
  },
];
