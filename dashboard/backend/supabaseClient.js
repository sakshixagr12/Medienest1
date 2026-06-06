require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Using environment variables strictly for security
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ [FATAL] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing from .env. Shutting down.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = { supabase };
