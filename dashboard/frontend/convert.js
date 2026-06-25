const fs = require('fs');
const path = require('path');

const admPath = path.join(__dirname, 'app', 'portal', 'admission-record', 'page.tsx');
const disPath = path.join(__dirname, 'app', 'portal', 'discharge-summary', 'page.tsx');

let admCode = fs.readFileSync(admPath, 'utf8');

// 1. Rename styles import
admCode = admCode.replace('import styles from "./page.module.css";', 'import styles from "../admission-record/page.module.css";');

// 2. Rename components
admCode = admCode.replace(/AdmissionRecordRedesign/g, 'DischargeSummaryRedesign');
admCode = admCode.replace(/export default function AdmissionRecordPage/g, 'export default function DischargeSummaryPage');
admCode = admCode.replace(/<TopBar\s+title="Admission Record"/g, '<TopBar\n          title="Discharge Summary"');
admCode = admCode.replace(/Admission Record/g, 'Discharge Summary');
admCode = admCode.replace(/admission_draft/g, 'discharge_summary_draft');

// 3. Keep the SummaryData interface mostly the same but ensure it has regNo, doa, dod, medicines
admCode = admCode.replace('phone: string;', 'phone: string;\n  regNo: string;\n  doa: string;\n  dod: string;\n  medicines: any[];\n  advice: string[];');

// 4. Replace the Supabase Insert
const insertRegex = /const { data: insertedRecord, error } = await supabase\.from\("admission_records"\)\.insert\(\[\s*\{[\s\S]*?\}\,\s*\]\)\.select\("id"\)\.single\(\);/;

const newInsert = `const { data: insertedRecord, error } = await supabase.from("discharge_summaries").insert([
        {
          patient_name: summary.patientName,
          reg_no: summary.regNo || '',
          age_sex: \`\${summary.age} / \${summary.sex}\`,
          doctor_name: summary.doctor,
          date_admission: summary.doa || summary.date_admission,
          date_discharge: summary.dod || new Date().toISOString(),
          diagnosis: summary.final_diagnosis || summary.diagnosis,
          complaints: JSON.stringify(summary.complaints),
          findings: JSON.stringify(summary.findings),
          treatment: JSON.stringify(summary.treatment_plan),
          medicines: JSON.stringify(summary.current_medications),
          advice: JSON.stringify(summary.advice || []),
          clinic_id: clinic?.id,
          patient_id: patientId,
        },
      ]).select("id").single();`;

admCode = admCode.replace(insertRegex, newInsert);

// Fix the redirect URLs
admCode = admCode.replace(/\/portal\/admission-record\/summary/g, '/portal/discharge-summary/view'); // fallback since summary dir doesn't exist
admCode = admCode.replace(/\/portal\/admission-record\/view/g, '/portal/discharge-summary/view');

fs.writeFileSync(disPath, admCode);
console.log("Successfully converted discharge summary!");
