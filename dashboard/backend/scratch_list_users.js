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
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) throw error;
    console.log("Users:", users.map(u => ({ id: u.id, email: u.email, created_at: u.created_at })));
  } catch (error) {
    console.error("Error listing users:", error);
  }
};
run();
