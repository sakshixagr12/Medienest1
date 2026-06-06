const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
require("dotenv").config();

// Define migrations: master initialization consolidated first, then extra features
const migrationFiles = [
  "v2_master_init.sql",
  "v2_clean/6_clinical_records.sql",
  "v2_clean/11_security_hardening.sql",
  "v2_clean/7_link_discharge_to_patients.sql",
  "v2_clean/29_rebuild_admission_records.sql",
  "v2_clean/30_schema_patch.sql",
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

    for (const fileRelPath of migrationFiles) {
      const filePath = path.join(__dirname, "migrations", fileRelPath);
      console.log(`⏳ Applying migration: ${fileRelPath}...`);
      const sql = fs.readFileSync(filePath, "utf8");
      await client.query(sql);
      console.log(`✅ Applied successfully.`);
    }

    console.log("⏳ Reloading PostgREST schema cache...");
    await client.query(`NOTIFY pgrst, 'reload schema';`);
    console.log("✅ All migrations applied successfully and schema reloaded!");
  } catch (err) {
    console.error("❌ Error during migrations:", err);
  } finally {
    await client.end();
  }
};

run();
