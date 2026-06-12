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
    console.log("Fetching prescriptions...");
    const { data, error } = await supabase.from("prescriptions").select("*").limit(5);
    if (error) {
      console.error("Error fetching prescriptions:", error);
    } else {
      console.log("Found prescriptions count:", data.length);
      console.log("Sample prescription keys:", data[0] ? Object.keys(data[0]) : "none");
      console.log("Sample data:", JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error("Critical error:", error);
  }
};

run();
