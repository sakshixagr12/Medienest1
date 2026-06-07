const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const run = async () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log("Fetching clinics...");
    const { data: clinics, error: errC } = await supabase.from("clinics").select("*");
    if (errC) console.error("Clinics error:", errC);
    else console.log("Clinics:", JSON.stringify(clinics, null, 2));

    console.log("Fetching doctors...");
    const { data: doctors, error: errD } = await supabase.from("doctors").select("*");
    if (errD) console.error("Doctors error:", errD);
    else console.log("Doctors:", JSON.stringify(doctors, null, 2));

    console.log("Fetching clinic_doctors...");
    const { data: clinicDocs, error: errCD } = await supabase.from("clinic_doctors").select("*");
    if (errCD) console.error("Clinic-Doctors error:", errCD);
    else console.log("Clinic-Doctors:", JSON.stringify(clinicDocs, null, 2));

  } catch (error) {
    console.error("Error:", error);
  }
};

run();
