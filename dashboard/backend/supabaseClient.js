require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Using environment variables strictly for security
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn("⚠️ Supabase URL or Key missing. Check .env file.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = { supabase };
