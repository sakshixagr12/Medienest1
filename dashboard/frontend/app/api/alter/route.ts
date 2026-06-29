import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://sbbinqrgczoynwizmnwc.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNiYmlucXJnY3pveW53aXptbndjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDc2MzUwMywiZXhwIjoyMDk2MzM5NTAzfQ.dBRCXToCoshuW_RtXnLa_e2LmMcjSJPR9UAFDnWIeDw";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET() {
  try {
    // Fetch all admission records
    const { data: records, error: fetchError } = await supabase
      .from("admission_records")
      .select("id, date_admission");

    if (fetchError) {
      return NextResponse.json({ success: false, error: fetchError.message });
    }

    if (!records || records.length === 0) {
      return NextResponse.json({ success: true, message: "No records found" });
    }

    let updatedCount = 0;
    const errors = [];

    for (const record of records) {
      if (record.date_admission) {
        // Parse the UTC date
        const currentUtcTime = new Date(record.date_admission);
        // Subtract 5 hours and 30 minutes (5.5 * 60 * 60 * 1000 = 19800000 ms)
        const correctedTime = new Date(currentUtcTime.getTime() - 19800000);

        const { error: updateError } = await supabase
          .from("admission_records")
          .update({ date_admission: correctedTime.toISOString() })
          .eq("id", record.id);

        if (updateError) {
          errors.push({ id: record.id, error: updateError.message });
        } else {
          updatedCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${updatedCount} records.`,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
