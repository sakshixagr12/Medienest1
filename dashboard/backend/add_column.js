const { Client } = require('pg');

async function addColumn() {
  const client = new Client({
    connectionString: 'postgresql://postgres:@987654321Utkarshshukla@db.sbbinqrgczoynwizmnwc.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected to DB");
    await client.query("ALTER TABLE discharge_summaries ADD COLUMN IF NOT EXISTS admission_id UUID;");
    console.log("Successfully added admission_id column to discharge_summaries.");
  } catch (err) {
    console.error("Error executing query:", err);
  } finally {
    await client.end();
  }
}

addColumn();
