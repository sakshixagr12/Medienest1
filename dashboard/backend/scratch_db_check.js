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
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log("--- TABLES IN PUBLIC SCHEMA ---");
    console.log(tablesRes.rows.map((r) => r.table_name).join(", "));

    const columnsRes = await client.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position;
    `);
    console.log("\n--- ALL COLUMNS IN ALL TABLES ---");
    const colsByTable = {};
    columnsRes.rows.forEach((r) => {
      if (!colsByTable[r.table_name]) colsByTable[r.table_name] = [];
      colsByTable[r.table_name].push(`${r.column_name} (${r.data_type})`);
    });
    for (const [tbl, cols] of Object.entries(colsByTable)) {
      console.log(`\nTable: ${tbl}`);
      console.log(cols.map((c) => `  - ${c}`).join("\n"));
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
};

run();
