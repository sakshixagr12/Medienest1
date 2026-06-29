import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://sbbinqrgczoynwizmnwc.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNiYmlucXJnY3pveW53aXptbndjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NjM1MDMsImV4cCI6MjA5NjMzOTUwM30.M4wZIozWu_jbjISfNRA_D875OvmGMJsWbA1aJ0hwI30";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET() {
  try {
    const { data, error } = await supabase
        .from('admission_records')
        .select('id, patient_name, date_admission, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
      return NextResponse.json({ success: false, error: error.message });
    }
    
    const formatted = data.map(d => ({
        ...d,
        local_time: new Date(d.date_admission).toLocaleString('en-IN')
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
