const { Client } = require("pg");
require("dotenv").config();

const run = async () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is missing.");
    return;
  }
  const client = new Client({ connectionString });
  await client.connect();

  try {
    const users = await client.query("SELECT id, email FROM auth.users;");
    console.log("--- USERS ---", users.rows);
    const patients = await client.query("SELECT id, name, clinic_id FROM public.patients;");
    console.log("--- PATIENTS ---", patients.rows);
    const prescriptions = await client.query("SELECT id, clinic_id, doctor_id, patient_id, diagnosis FROM public.prescriptions;");
    const queue = await client.query("SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'doctor_queue';");
    console.log("--- REPLICAS ---", queue.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
};

run();
