const fs = require('fs');
const { Client } = require('pg');
require('dotenv').config();

const run = async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    await client.connect();
    console.log('Connected to target DB.');
    const sql = fs.readFileSync('migrations/v2_clean/7_link_discharge_to_patients.sql', 'utf8');
    await client.query(sql);
    console.log('Migration 7 applied successfully.');
    
    await client.query(`NOTIFY pgrst, 'reload schema';`);
    console.log('PostgREST schema reloaded.');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
};

run();
