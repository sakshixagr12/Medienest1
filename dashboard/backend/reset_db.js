const { Client } = require("pg");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const resetDatabase = async () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("❌ Error: DATABASE_URL is not configured in .env");
    process.exit(1);
  }

  const client = new Client({ connectionString });

  try {
    console.log("⏳ Connecting to Database...");
    await client.connect();
    console.log("✅ Connected successfully.");

    // 1. Delete all Supabase Auth Users (this cascades to dependent tables)
    console.log("⏳ Deleting all user accounts from auth.users...");
    try {
      await client.query("DELETE FROM auth.users;");
      console.log("✅ All auth users and session histories removed.");
    } catch (authErr) {
      console.warn("⚠️ Warning deleting auth users (might lack permissions):", authErr.message);
    }

    // 2. Drop application-specific tables
    console.log("⏳ Dropping application tables...");
    const tablesToDrop = [
      "public.clinic_doctors",
      "public.clinic_services",
      "public.doctor_queue",
      "public.processed_payments",
      "public.subscriptions",
      "public.audit_logs",
      "public.trial_claims",
      "public.patient_histories",
      "public.admission_records",
      "public.discharge_summaries",
      "public.prescriptions",
      "public.receipts",
      "public.patients",
      "public.doctors",
      "public.clinics",
      "public.medicines",
      "public.schema_migrations"
    ];

    for (const table of tablesToDrop) {
      await client.query(`DROP TABLE IF EXISTS ${table} CASCADE;`);
    }
    console.log("✅ All application tables dropped successfully.");

    console.log("🎉 Database wipe complete. Running migration suite to rebuild public schema...");
    
    // Close current connection
    await client.end();

    // 6. Execute migrate_all.js to run migrations fresh
    const { execSync } = require("child_process");
    console.log("🚀 Starting migrate_all.js...");
    execSync("node migrate_all.js", { stdio: "inherit", cwd: __dirname });
    console.log("✅ Database rebuild finished successfully!");
  } catch (err) {
    console.error("❌ Reset Database Error:", err.message);
    process.exit(1);
  }
};

resetDatabase();
