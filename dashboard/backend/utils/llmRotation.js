// dashboard/backend/utils/llmRotation.js

const badKeys = new Map(); // key -> blacklist expiration timestamp

const isKeyBad = (key) => {
  const expiry = badKeys.get(key);
  if (expiry && Date.now() < expiry) return true;
  if (expiry) badKeys.delete(key); // Cleanup expired blacklist
  return false;
};

const blacklistKey = (key, status) => {
  if (status === 401 || status === 403) {
    console.warn(`[LLM-Rotation] Blacklisting invalid key: ${key.substring(0, 12)}... for 1 hour.`);
    badKeys.set(key, Date.now() + 60 * 60 * 1000); // 1 hour
  } else if (status === 429) {
    console.warn(`[LLM-Rotation] Blacklisting rate-limited key: ${key.substring(0, 12)}... for 30 seconds.`);
    badKeys.set(key, Date.now() + 30 * 1000); // 30 seconds
  } else {
    console.warn(`[LLM-Rotation] Blacklisting failed key: ${key.substring(0, 12)}... for 15 seconds.`);
    badKeys.set(key, Date.now() + 15 * 1000); // 15 seconds
  }
};

const getProviders = () => {
  const providers = [];

  // 1. Gemini (Direct Google API) - Best
  if (process.env.GEMINI_API_KEY) {
    const keys = process.env.GEMINI_API_KEY.split(',').map(k => k.trim()).filter(Boolean);
    keys.forEach((key, index) => {
      if (!isKeyBad(key)) {
        providers.push({
          name: `Gemini-${index}`,
          type: 'gemini',
          key,
          url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`
        });
      }
    });
  }

  // 2. Groq (Llama-3.3-70b-versatile / Llama-3.1-8b-instant) - Better
  if (process.env.GROQ_API_KEY) {
    const keys = process.env.GROQ_API_KEY.split(',').map(k => k.trim()).filter(Boolean);
    keys.forEach((key, index) => {
      if (!isKeyBad(key)) {
        providers.push({
          name: `Groq-${index}`,
          type: 'openai',
          key,
          url: 'https://api.groq.com/openai/v1/chat/completions',
          model: 'llama-3.3-70b-versatile'
        });
      }
    });
  }

  // 3. Nvidia (Llama-3.1-8b-instruct) - Good
  if (process.env.NVIDIA_API_KEY) {
    const keys = process.env.NVIDIA_API_KEY.split(',').map(k => k.trim()).filter(Boolean);
    keys.forEach((key, index) => {
      if (!isKeyBad(key)) {
        providers.push({
          name: `Nvidia-${index}`,
          type: 'openai',
          key,
          url: 'https://integrate.api.nvidia.com/v1/chat/completions',
          model: 'meta/llama-3.1-8b-instruct'
        });
      }
    });
  }

  // 4. OpenRouter (Fallback) - Good
  if (process.env.OPENROUTER_API_KEY) {
    const keys = process.env.OPENROUTER_API_KEY.split(',').map(k => k.trim()).filter(Boolean);
    keys.forEach((key, index) => {
      if (!isKeyBad(key)) {
        providers.push({
          name: `OpenRouter-${index}`,
          type: 'openai',
          key,
          url: 'https://openrouter.ai/api/v1/chat/completions',
          model: 'google/gemini-2.5-flash',
          extraHeaders: {
            'HTTP-Referer': 'https://medienest.com',
            'X-Title': 'MedieNest'
          }
        });
      }
    });
  }

  return providers;
};

/**
 * Ask LLM using ranked rotation with automatic fallback.
 * @param {Array} messages - Chat messages context [{role, content}]
 * @param {string} systemPrompt - Instruction system prompt
 * @param {number} maxTokens - Max output tokens limit
 * @returns {Promise<string>} Responded content
 */
async function askLLM(messages, systemPrompt, maxTokens = 1200) {
  const providers = getProviders();

  if (providers.length === 0) {
    console.error('[LLM-Rotation] All configured provider keys are currently blacklisted or missing!');
    throw new Error('No active LLM providers available');
  }

  let lastError = null;

  for (const provider of providers) {
    try {
      console.log(`[LLM-Rotation] Attempting generation via ${provider.name} (${provider.type === 'gemini' ? 'Gemini' : provider.model})...`);

      if (provider.type === 'gemini') {
        const payload = {
          contents: [{
            parts: [
              { text: `System Instruction: ${systemPrompt}\n\nContext:\n${messages.map(m => `${m.role === 'system' ? 'System' : m.role}: ${m.content}`).join('\n')}` }
            ]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: maxTokens
          }
        };

        const res = await fetch(provider.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(15000)
        });

        if (!res.ok) {
          throw { status: res.status, message: `HTTP Error ${res.status}` };
        }

        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          console.log(`[LLM-Rotation] ✅ Success: ${provider.name} responded.`);
          return text.trim();
        } else {
          throw new Error('Gemini returned an empty response candidates list');
        }
      } else {
        const payload = {
          model: provider.model,
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages
          ],
          temperature: 0.1,
          max_tokens: maxTokens
        };

        const headers = {
          'Authorization': `Bearer ${provider.key}`,
          'Content-Type': 'application/json',
          ...(provider.extraHeaders || {})
        };

        const res = await fetch(provider.url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(15000)
        });

        if (!res.ok) {
          throw { status: res.status, message: `HTTP Error ${res.status}` };
        }

        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) {
          console.log(`[LLM-Rotation] ✅ Success: ${provider.name} responded.`);
          return text.trim();
        } else {
          throw new Error(`${provider.name} returned an empty completion choice list`);
        }
      }
    } catch (err) {
      console.warn(`[LLM-Rotation] ❌ Provider ${provider.name} failed: ${err.message || err}`);
      lastError = err;
      
      // Blacklist key based on failure status
      const failStatus = err.status || 500;
      blacklistKey(provider.key, failStatus);
    }
  }

  console.error('[LLM-Rotation] All available providers have been exhausted and failed!');
  throw lastError || new Error('All LLM providers failed');
}

module.exports = { askLLM };
