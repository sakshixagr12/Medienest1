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

    // List clinics
    const clinicsRes = await client.query(`
      SELECT id, owner_user_id, name, email, status, approved_at 
      FROM public.clinics;
    `);
    console.log("\n--- Registered Clinics ---");
    console.table(clinicsRes.rows);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.end();
  }
};

run();
