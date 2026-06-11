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
    const userId = "0418dc50-b05d-479b-bd0d-fc70dbe01714";
    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
      password: "Password123!"
    });
    if (error) throw error;
    console.log("Successfully set password for user!", data.user.email);
  } catch (error) {
    console.error("Error setting password:", error);
  }
};
run();
