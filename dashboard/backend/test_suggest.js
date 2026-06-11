// dashboard/backend/test_suggest.js
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "./.env") });
const { suggestClinicalPath } = require("./routes/recommendations");

async function main() {
  console.log("Testing suggestClinicalPath...");
  try {
    const result = await suggestClinicalPath(
      "High blood pressure and headaches",
      "BP 150/95 mmHg, otherwise normal",
      {
        diagnosis: "Essential Hypertension",
        medicines: [{ name: "Amlodipine", type: "Tab", dose: "5mg" }],
        age: 45,
        gender: "m",
        weight: 82,
        existing_conditions: "Type 2 Diabetes",
        dietary_preference: "veg",
        lifestyle: "Sedentary desk job, high stress"
      }
    );
    console.log("RESULT:\n", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("Test failed:", err);
  }
}

main();
