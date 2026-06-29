// Run using: node --env-file=.env.local check.js
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecords() {
    const { data, error } = await supabase
        .from('admission_records')
        .select('id, patient_name, date_admission, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) console.error(error);
    else {
        console.log("Latest records:");
        data.forEach(d => {
            console.log(`- Name: ${d.patient_name}, DB_Date: ${d.date_admission}, Local: ${new Date(d.date_admission).toLocaleString('en-IN')}`);
        });
    }
}

checkRecords();
