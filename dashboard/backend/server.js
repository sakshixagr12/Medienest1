require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 4001;

// Supabase Initialization - Using Service Role for background tasks
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceRole);
// Patient History route
const patientHistoryRouter = require('./routes/patientHistory');
const recommendationsRouter = require('./routes/recommendations');
const queueRouter = require('./routes/queue');
const analyticsRouter = require('./routes/analytics');
const notificationsRouter = require('./routes/notifications');

const { requireAuth, requireClinicAccess } = require('./middleware/authMiddleware');

// Validation Helpers
function isValidHindi(text) {
    if (!text) return true;
    // Check if the text contains Devanagari characters
    // Allowing for common punctuation and whitespace
    return /^[\u0900-\u097F\s.,!?:\n-ँ-ःा-्]*$/.test(text);
}

// Middleware
app.use(helmet()); // Professional security headers
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use('/api/patient-history', requireAuth, requireClinicAccess, patientHistoryRouter);
app.use('/api/recommendations', requireAuth, recommendationsRouter);
app.use('/api/queue', requireAuth, requireClinicAccess, queueRouter);
app.use('/api/analytics', requireAuth, requireClinicAccess, analyticsRouter);
app.use('/api/notifications', requireAuth, requireClinicAccess, notificationsRouter);

// ─── Basic Health Check ───
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'MediNest API is running' });
});

app.get('/api/ping', async (req, res) => {
    try {
        // Verify Supabase connectivity
        const { data, error } = await supabase.from('medicines').select('count', { count: 'exact', head: true });
        
        if (error) throw error;
        
        res.json({ 
            success: true, 
            status: 'online', 
            database: 'connected',
            timestamp: new Date().toISOString() 
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            status: 'degraded',
            database: 'disconnected',
            error: err.message,
            timestamp: new Date().toISOString() 
        });
    }
});



// ─── Secure DB Operations (Example) ───
app.post('/api/secure-save', async (req, res) => {
    const { table, data } = req.body;
    try {
        const { data: result, error } = await supabase.from(table).insert(data).select();
        if (error) throw error;
        res.json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─── AI SUMMARY (PRODUCTION GRADE) ──────────────────────────────────
app.post('/api/prescriptions/:id/ai-summary', async (req, res) => {
    const { id } = req.params;
    const { lang = 'English', persist = true } = req.body || req.query || {};
    
    console.log(`🤖 [AI] Starting clinical snapshot for Rx: ${id} (Language: ${lang}, Persist: ${persist})`);

    try {
        let rx = req.body || {};
        let patientName = rx.patientName || 'Patient';
        let medicines = rx.medicines || [];

        // 1. Fetch Rx Data if incomplete
        if (!rx.complaints || !rx.findings) {
            const { data: dbRx, error: rxError } = await supabase
                .from('prescriptions')
                .select('*, patients(name)')
                .eq('id', id)
                .single();

            if (rxError || !dbRx) throw new Error('Prescription not found');
            rx = dbRx;
            patientName = dbRx.patients?.name || 'Patient';
            medicines = typeof dbRx.medicines === 'string' ? JSON.parse(dbRx.medicines) : dbRx.medicines;
        }

        // 2. Production Grade Prompt Construction
        const systemRole = `
You are the "✦ Secure AI Agent Record", a specialized clinical assistant. Your goal is to provide a reassuring, safe, and professional recovery guide.

IMPORTANT: RETURN ONLY A PURE JSON OBJECT. NO PREAMBLE. NO GREETINGS. NO INTRODUCTIONS.

AI ROLE:
- You ONLY explain the doctor's prescription. You DO NOT prescribe or guess.

MEDICAL RULES (STRICT):
1. DOSAGE LOGIC: 
   - IF doctor provided dosage/frequency (e.g., "1-0-1", "SOS"): Show EXACT SAME and explain it (e.g., ${lang === 'Hindi' ? '"1-0-1 (सुबह-दोपहर-शाम)"' : '"1-0-1 (Morning-Noon-Night)"'}).
   - IF doctor did NOT provide dosage: DO NOT GUESS. Show: ${lang === 'Hindi' ? '"डॉक्टर के अनुसार लें"' : '"As directed by doctor"'}.
2. FORBIDDEN: NEVER suggest "Twice a day", "Morning/Night", or "5 days" unless explicitly provided in the INPUT med list.
3. PROTOCOLS: If Dengue/Viral detected, prioritize hydration and bleeding warning signs.

TONE & STYLE:
- Warm, encouraging, supportive in ${lang}.
- Use specific emojis: 💊, ⏳, 🥗, 🚨, 📅.

JSON OUTPUT FORMAT:
{
  "greeting": "👋 Hello ${patientName}",
  "condition": "Explanation of the illness in ${lang}",
  "medicines": [
    {
      "name": "Medicine name in ${lang}",
      "purpose": "Purpose of medicine in ${lang}",
      "dosage": "Exact dosage from input + explanation ${lang === 'Hindi' ? '(e.g. 1-0-1 (सुबह-दोपहर-शाम))' : '(e.g. 1-0-1 (Morning-Noon-Night))'} OR ${lang === 'Hindi' ? 'डॉक्टर के अनुसार लें' : 'As directed by doctor'}"
    }
  ],
  "expectations": "Brief recovery timeline and what the patient should expect in the next 2-3 days in ${lang}",
  "care": "Simple diet/rest points in ${lang}",
  "warnings": ["Alerts in ${lang}"],
  "next_steps": "Closing in ${lang}"
}
`;

        const userPrompt = `
INPUT DATA:
- Patient: ${patientName}
- Diagnosis: ${rx.diagnosis || 'N/A'}
- Findings (O/E): ${rx.findings || 'N/A'}
- Symptoms: ${rx.complaints || 'N/A'}
- Medicines: ${JSON.stringify(medicines)}
- Advice: ${rx.advice}
- Follow-up Date: ${rx.followUp || rx.valid_till || 'N/A'}
`;

        let summaryJson = null;
        let attempts = 0;
        const maxAttempts = 2;

        while (attempts < maxAttempts && !summaryJson) {
            attempts++;
            console.log(`🤖 [AI] Generation attempt ${attempts}/${maxAttempts} for ${lang}...`);
            
            const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${process.env.NVIDIA_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "meta/llama-3.1-8b-instruct",
                    messages: [
                        { role: "system", content: systemRole },
                        { role: "user", content: userPrompt }
                    ],
                    temperature: 0.1,
                    max_tokens: 1200, // Increased to prevent truncation
                    top_p: 1
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`❌ [AI API ERROR]:`, errorText);
                if (attempts === maxAttempts) throw new Error('AI Service unavailable');
                continue;
            }

            const aiResponse = await response.json();
            let content = aiResponse.choices?.[0]?.message?.content || '';
            
            try {
                // 1. Standardize cleanup for control characters
                content = content.replace(/[\u0000-\u001F\u007F-\u009F\uFFFD]/g, '');

                // 2. Locate the JSON block
                const firstBrace = content.indexOf('{');
                const lastBrace = content.lastIndexOf('}');
                
                if (firstBrace === -1 || lastBrace === -1) {
                  throw new Error('No JSON object found in AI response');
                }

                let jsonStr = content.substring(firstBrace, lastBrace + 1);

                // 3. Aggressive Sanitization: Replace literal newlines and tabs with spaces
                // This is the most common cause of JSON.parse failures in LLM outputs
                jsonStr = jsonStr.replace(/\n/g, ' ').replace(/\r/g, ' ').replace(/\t/g, ' ');
                
                const parsed = JSON.parse(jsonStr);
                
                // VALIDATION: If lang is Hindi, check if it's pure Hindi
                if (lang === 'Hindi') {
                    const isPure = isValidHindi(parsed.condition) && isValidHindi(parsed.care);
                    if (!isPure && attempts < maxAttempts) {
                        console.warn(`⚠️ [AI] Language mix detected in Hindi output. Retrying...`);
                        continue;
                    }
                }
                
                summaryJson = parsed;
            } catch (pErr) {
                console.error(`⚠️ [AI] JSON Extraction failed on attempt ${attempts}: ${pErr.message}`);
                console.log('--- FAILED CONTENT ---');
                console.log(content);
                console.log('----------------------');
                if (attempts === maxAttempts) throw pErr;
            }
        }

        // 3. Persist and Return
        if (persist === true || persist === 'true') {
            await supabase.from('prescriptions').update({ ai_summary: summaryJson }).eq('id', id);
        }

        res.json({ success: true, summary: summaryJson });
    } catch (err) {
        console.error(`❌ [AI ERROR]:`, err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});


// ─── PUBLIC DOCTOR PROFILE (Patient-Facing, No Private Info) ─────────
app.get('/api/doctor-profile/:doctorId', async (req, res) => {
    const { doctorId } = req.params;
    try {
        const { data, error } = await supabase
            .from('doctors')
            .select('name, qualification, specialty, registration_number, profile_photo_url')
            .eq('id', doctorId)
            .single();

        if (error || !data) {
            return res.status(404).json({ success: false, error: 'Doctor not found' });
        }

        res.json({
            success: true,
            doctor: {
                name: data.name,
                qualification: data.qualification || 'MBBS',
                specialty: data.specialty || 'General Consultant',
                registration_number: data.registration_number || 'N/A',
                profile_photo_url: data.profile_photo_url || null
            }
        });
    } catch (err) {
        console.error('❌ Doctor Profile Error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─── PUBLIC DOCTOR PROFILE BY PRESCRIPTION ID ─────────
app.get('/api/doctor-profile-by-rx/:rxId', async (req, res) => {
    const { rxId } = req.params;
    try {
        // Step 1: Get doctor_id from prescription
        const { data: rx, error: rxErr } = await supabase
            .from('prescriptions')
            .select('doctor_id, doctor_name')
            .eq('id', rxId)
            .single();

        if (rxErr || !rx) {
            return res.status(404).json({ success: false, error: 'Prescription not found' });
        }

        // Step 2: Fetch doctor details
        if (rx.doctor_id) {
            const { data, error } = await supabase
                .from('doctors')
                .select('name, qualification, specialty, registration_number, profile_photo_url')
                .eq('id', rx.doctor_id)
                .single();

            if (!error && data) {
                return res.json({
                    success: true,
                    doctor: {
                        name: data.name,
                        qualification: data.qualification || 'MBBS',
                        specialty: data.specialty || 'General Consultant',
                        registration_number: data.registration_number || 'N/A',
                        profile_photo_url: data.profile_photo_url || null
                    }
                });
            }
        }

        // Fallback: use doctor_name from prescription
        res.json({
            success: true,
            doctor: {
                name: rx.doctor_name || 'Consulting Doctor',
                qualification: 'MBBS',
                specialty: 'General Consultant',
                registration_number: 'N/A',
                profile_photo_url: null
            }
        });
    } catch (err) {
        console.error('❌ Doctor Profile by Rx Error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- GLOBAL JSON ERROR HANDLER ---
app.use((req, res, next) => {
    res.status(404).json({ success: false, error: 'Route not found' });
});

app.use((err, req, res, next) => {
    console.error('🔥 Global Error:', err.stack);
    res.status(500).json({ success: false, error: 'Internal Server Error', details: err.message });
});

// ─── Start Server ───
const startServer = (port) => {
    app.listen(port, () => {
        console.log(`🚀 [AI 4/4] MediNest API is LIVE on port ${port}`);
    }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`❌ Port ${port} is occupied. Please kill the process manually.`);
            process.exit(1);
        } else {
            console.error('❌ Server Error:', err);
        }
    });
};

startServer(PORT);
