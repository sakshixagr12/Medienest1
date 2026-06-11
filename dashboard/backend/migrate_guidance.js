// Migration: Add guidance_sheet JSONB column to prescriptions table
// Uses pg and DATABASE_URL
const { Client } = require('pg');
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("❌ Missing DATABASE_URL in .env");
  process.exit(1);
}

async function migrate() {
  console.log("🔄 Adding guidance_sheet column to prescriptions table using pg client...");

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected to PostgreSQL DB successfully.");

    const query = "ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS guidance_sheet JSONB DEFAULT NULL;";
    console.log(`Executing: ${query}`);
    await client.query(query);
    console.log("✅ Column 'guidance_sheet' successfully added (or already existed)!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
