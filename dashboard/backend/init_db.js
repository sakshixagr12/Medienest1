const fs = require("fs");
const { Client } = require("pg");
require("dotenv").config();

const run = async () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Error: DATABASE_URL is not configured in .env");
    process.exit(1);
  }

  const client = new Client({ connectionString });

  try {
    console.log("⏳ Connecting to target Database...");
    await client.connect();
    console.log("Connected successfully.");

    console.log("⏳ Reading v2_master_init.sql...");
    const sql = fs.readFileSync("migrations/v2_master_init.sql", "utf8");

    console.log(
      "⏳ Executing database schema master initialization (consolidated)...",
    );
    await client.query(sql);
    console.log("Master schema initialized successfully.");

    console.log("⏳ Reloading PostgREST schema...");
    await client.query(`NOTIFY pgrst, 'reload schema';`);
    console.log("PostgREST schema reloaded.");
  } catch (err) {
    console.error("Error during schema initialization:", err);
  } finally {
    await client.end();
  }
};

run();
