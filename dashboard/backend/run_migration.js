const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected to PostgreSQL DB");

    const sqlFile = path.join(__dirname, 'migrations', 'v2_clean', '45_fix_patients_rls.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log("Running migration...");
    await client.query(sql);
    console.log("Migration executed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await client.end();
  }
}

runMigration();
