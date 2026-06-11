const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
require("dotenv").config();

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

    const permissionFiles = [
      "v2_clean/10_permissions/1_fix_onboarding_insert.sql",
      "v2_clean/10_permissions/2_clinical_access_fix.sql",
      "v2_clean/10_permissions/3_public_sharing_access.sql"
    ];

    for (const fileRelPath of permissionFiles) {
      const filePath = path.join(__dirname, "migrations", fileRelPath);
      console.log(`⏳ Applying permissions migration: ${fileRelPath}...`);
      const sql = fs.readFileSync(filePath, "utf8");
      await client.query(sql);
      console.log(`✅ Applied successfully.`);
    }

    console.log("⏳ Reloading PostgREST schema cache...");
    await client.query(`NOTIFY pgrst, 'reload schema';`);
    console.log("✅ Permissions applied successfully and schema reloaded!");
  } catch (err) {
    console.error("❌ Error during permission application:", err);
  } finally {
    await client.end();
  }
};

run();
