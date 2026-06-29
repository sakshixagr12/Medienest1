const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://sbbinqrgczoynwizmnwc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNiYmlucXJnY3pveW53aXptbndjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NjM1MDMsImV4cCI6MjA5NjMzOTUwM30.M4wZIozWu_jbjISfNRA_D875OvmGMJsWbA1aJ0hwI30';

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
