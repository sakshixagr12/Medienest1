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

    // List all views in public schema
    const viewsRes = await client.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public';
    `);
    console.log("\n--- Views in public schema ---");
    console.table(viewsRes.rows);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.end();
  }
};

run();
