import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    
    const formatted = data.map((d: any) => ({
        ...d,
        local_time: new Date(d.date_admission).toLocaleString('en-IN')
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
