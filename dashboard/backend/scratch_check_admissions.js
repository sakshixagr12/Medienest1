const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkAdmissions() {
  const { data, error } = await supabase.from("admission_records").select("id, patient_id, clinic_id, diagnosis, created_at").limit(5);
  console.log("Error:", error);
  console.log("Data:", data);
}

checkAdmissions();
