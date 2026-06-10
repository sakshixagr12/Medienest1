const { Client } = require("pg");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const deleteUser = async () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("❌ Error: DATABASE_URL is not configured.");
    process.exit(1);
  }

  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log("⏳ Deleting user shuklajimasthai@gmail.com...");

    const res = await client.query(
      "DELETE FROM auth.users WHERE email = $1 RETURNING id, email;",
      ["shuklajimasthai@gmail.com"]
    );

    if (res.rows.length > 0) {
      console.log(`✅ Deleted user: ${res.rows[0].email} (ID: ${res.rows[0].id})`);
    } else {
      console.log("ℹ️ No user found with email shuklajimasthai@gmail.com.");
    }
  } catch (err) {
    console.error("❌ Error deleting user:", err.message);
  } finally {
    await client.end();
  }
};

deleteUser();
