const { Client } = require("pg");
require("dotenv").config();

const run = async () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set.");
    return;
  }
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log("Connected to DB.");

    // Check policies on patients
    const policiesRes = await client.query(`
      SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
      FROM pg_policies
      WHERE tablename = 'patients';
    `);
    console.log("\n--- Policies on patients table ---");
    console.log(JSON.stringify(policiesRes.rows, null, 2));

    // Check definition of get_my_clinic_ids function
    const funcRes = await client.query(`
      SELECT pg_get_functiondef(p.oid) AS definition
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE p.proname = 'get_my_clinic_ids';
    `);
    console.log("\n--- Definition of get_my_clinic_ids ---");
    if (funcRes.rows.length > 0) {
      console.log(funcRes.rows[0].definition);
    } else {
      console.log("Function get_my_clinic_ids not found.");
    }

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.end();
  }
};

run();
