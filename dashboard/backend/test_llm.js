// dashboard/backend/test_llm.js
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "./.env") });
const { askLLM } = require("./utils/llmRotation");

async function main() {
  console.log("Testing LLM Rotation...");
  console.log("GEMINI_API_KEY exists:", !!process.env.GEMINI_API_KEY);
  console.log("GROQ_API_KEY exists:", !!process.env.GROQ_API_KEY);
  console.log("NVIDIA_API_KEY exists:", !!process.env.NVIDIA_API_KEY);
  console.log("OPENROUTER_API_KEY exists:", !!process.env.OPENROUTER_API_KEY);

  try {
    const response = await askLLM(
      [{ role: "user", content: "Say hello briefly." }],
      "You are a helpful assistant.",
      100
    );
    console.log("SUCCESS! Response:", response);
  } catch (err) {
    console.error("FAILED with error:", err);
  }
}

main();
