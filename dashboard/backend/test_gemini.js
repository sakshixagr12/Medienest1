// dashboard/backend/test_gemini.js
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "./.env") });

async function testGeminiUrl(url, name) {
  const payload = {
    contents: [{
      parts: [
        { text: "Say hello briefly." }
      ]
    }]
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    console.log(`[${name}] Status:`, res.status);
    if (res.ok) {
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      console.log(`[${name}] SUCCESS:`, text ? text.trim() : "empty");
      return true;
    } else {
      const text = await res.text();
      console.log(`[${name}] FAILED:`, text);
      return false;
    }
  } catch (err) {
    console.error(`[${name}] Fetch error:`, err);
    return false;
  }
}

async function run() {
  const key = process.env.GEMINI_API_KEY.split(',')[0].trim();
  
  await testGeminiUrl(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${key}`, "v1/gemini-1.5-flash");
  await testGeminiUrl(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, "v1beta/gemini-2.5-flash");
  await testGeminiUrl(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${key}`, "v1beta/gemini-1.5-flash-latest");
  await testGeminiUrl(`https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${key}`, "v1/gemini-pro");
}

run();
