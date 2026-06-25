const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

// Define migrations: master initialization consolidated first, then extra features
const migrationFiles = [
  "v2_master_init.sql",
  "v2_clean/10_permissions/1_fix_onboarding_insert.sql",
  "v2_clean/10_permissions/2_clinical_access_fix.sql",
  "v2_clean/6_clinical_records.sql",
  "v2_clean/11_security_hardening.sql",
  "v2_clean/7_link_discharge_to_patients.sql",
  "v2_clean/29_rebuild_admission_records.sql",
  "v2_clean/30_schema_patch.sql",
  "v2_clean/31_add_admission_status.sql",
  "v2_clean/35_queue_optimizations.sql",
  "v2_clean/36_doctor_specific_queue.sql",
  "v2_clean/37_unique_clinic_services.sql",
  "v2_clean/38_subscriptions_and_payments.sql",
  "v2_clean/39_add_clinic_type.sql",
  "v2_clean/40_fix_doctor_rls.sql",
  "v2_clean/41_add_trial_claims.sql",
  "v2_clean/42_harden_rls_policies.sql",
  "v2_clean/43_add_ai_columns.sql",
  "v2_clean/44_add_queue_date_param.sql",
];


const run = async () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("❌ Error: DATABASE_URL is not configured in .env");
    process.exit(1);
  }

  const client = new Client({ connectionString });

  try {
    console.log("⏳ Connecting to target Database...");
    await client.connect();
    console.log("✅ Connected successfully.");

    // 1. Create schema_migrations table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.schema_migrations (
        migration_name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 2. Check if clinics table exists (to detect if master init was already applied previously)
    const checkClinics = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'clinics'
      );
    `);
    const wasAlreadyInitialized = checkClinics.rows[0].exists;

    // Get list of already applied migrations
    const appliedRes = await client.query(`SELECT migration_name FROM public.schema_migrations;`);
    const appliedSet = new Set(appliedRes.rows.map(r => r.migration_name));

    // If clinics table exists but schema_migrations is empty, pre-populate all current migrations
    if (wasAlreadyInitialized && appliedSet.size === 0) {
      console.log("ℹ️ Existing clinics table detected. Pre-populating current migrations as applied...");
      for (const m of migrationFiles) {
        await client.query(
          `INSERT INTO public.schema_migrations (migration_name) VALUES ($1) ON CONFLICT DO NOTHING;`,
          [m]
        );
        appliedSet.add(m);
      }
    }

    // 3. Apply pending migrations
    let appliedAny = false;
    for (const fileRelPath of migrationFiles) {
      if (appliedSet.has(fileRelPath)) {
        console.log(`ℹ️ Skipping already applied migration: ${fileRelPath}`);
        continue;
      }

      const filePath = path.join(__dirname, "migrations", fileRelPath);
      console.log(`⏳ Applying migration: ${fileRelPath}...`);
      const sql = fs.readFileSync(filePath, "utf8");
      await client.query(sql);
      
      // Record successful application
      await client.query(
        `INSERT INTO public.schema_migrations (migration_name) VALUES ($1);`,
        [fileRelPath]
      );
      console.log(`✅ Applied successfully.`);
      appliedAny = true;
    }

    if (appliedAny) {
      console.log("⏳ Reloading PostgREST schema cache...");
      await client.query(`NOTIFY pgrst, 'reload schema';`);
      console.log("✅ New migrations applied successfully and schema reloaded!");
    } else {
      console.log("✅ No new migrations to apply. Database is up to date.");
    }
  } catch (err) {
    console.error("❌ Error during migrations:", err);
  } finally {
    await client.end();
  }
};

run();
