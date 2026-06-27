import { NextResponse } from "next/server";
import { Client } from "pg";

export async function GET() {
  try {
    const client = new Client({
      connectionString: 'postgresql://postgres:@987654321Utkarshshukla@db.sbbinqrgczoynwizmnwc.supabase.co:5432/postgres'
    });
    
    await client.connect();
    await client.query(`
      ALTER TABLE discharge_summaries 
      ADD COLUMN IF NOT EXISTS discharge_condition JSONB DEFAULT '[]'::jsonb;
    `);
    await client.end();
    
    return NextResponse.json({ success: true, message: "Added discharge_condition column" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
