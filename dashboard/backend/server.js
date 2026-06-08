require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { z } = require("zod");
const { createClient } = require("@supabase/supabase-js");
const { Cashfree } = require("cashfree-pg");
const { askLLM } = require("./utils/llmRotation");

const app = express();
const PORT = process.env.PORT || 4001;

// Supabase Initialization - Using Service Role for background tasks
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceRole);

// Cashfree PG SDK Initialization
const cashfree = new Cashfree(
  process.env.CASHFREE_ENV === "production" ? "PRODUCTION" : "SANDBOX",
  process.env.CASHFREE_APP_ID,
  process.env.CASHFREE_SECRET_KEY
);
// Patient History route
const patientHistoryRouter = require("./routes/patientHistory");
const recommendationsRouter = require("./routes/recommendations");
const queueRouter = require("./routes/queue");
const analyticsRouter = require("./routes/analytics");
const notificationsRouter = require("./routes/notifications");

const {
  requireAuth,
  requireClinicAccess,
} = require("./middleware/authMiddleware");

// Validation Helpers
function isValidHindi(text) {
  if (!text) return true;
  // Check if the text contains Devanagari characters
  // Allowing for common punctuation and whitespace
  return /^[\u0900-\u097F\s.,!?:\n-ँ-ःा-्]*$/.test(text);
}

// Middleware
app.use(helmet()); // Professional security headers

// ─── CORS (Allow only known origins) ────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:3000", "http://127.0.0.1:3000"];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server / curl (no origin header) in dev only
      if (!origin || allowedOrigins.includes(origin))
        return callback(null, true);
      callback(new Error(`CORS: Origin '${origin}' not allowed`));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// ─── RATE LIMITING ───────────────────────────────────────────────────────────
// General limiter — all routes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many requests. Please try again later.",
  },
});

// Strict limiter — AI endpoints (cost control)
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 AI calls per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error:
      "AI rate limit reached. Please wait before generating another summary.",
  },
});

app.use(generalLimiter);
app.use(express.json());
app.use(
  "/api/patient-history",
  requireAuth,
  requireClinicAccess,
  patientHistoryRouter,
);
app.use("/api/recommendations", requireAuth, recommendationsRouter);
app.use("/api/queue", requireAuth, requireClinicAccess, queueRouter);
app.use("/api/analytics", requireAuth, requireClinicAccess, analyticsRouter);
app.use(
  "/api/notifications",
  requireAuth,
  requireClinicAccess,
  notificationsRouter,
);

// ─── CASHFREE PAYMENT & SUBSCRIPTION ENDPOINTS ────────────────────────────────
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many requests. Please try again later.",
  },
});

// Map plans to amounts
const PLAN_PRICING = {
  "Starter": { inr: 99.00, paise: 9900 },
  "Clinic": { inr: 249.00, paise: 24900 },
  "Professional": { inr: 499.00, paise: 49900 }
};

app.post(
  "/api/payment/create-order",
  requireAuth,
  requireClinicAccess,
  paymentLimiter,
  async (req, res) => {
    try {
      const { clinic_id, plan_name } = req.body;
      if (!clinic_id || !plan_name) {
        return res.status(400).json({ success: false, error: "clinic_id and plan_name are required" });
      }

      const plan = PLAN_PRICING[plan_name];
      if (!plan) {
        return res.status(400).json({ success: false, error: "Invalid plan selection" });
      }

      // Fetch clinic details for user email/phone
      const { data: clinic, error: clinicErr } = await supabase
        .from("clinics")
        .select("*")
        .eq("id", clinic_id)
        .maybeSingle();

      if (clinicErr || !clinic) {
        return res.status(404).json({ success: false, error: "Clinic not found" });
      }

      // Handle and clean phone number for Cashfree
      let phone = clinic.phone || req.user.phone || "9999999999";
      phone = phone.replace(/\D/g, "");
      if (phone.length === 12 && phone.startsWith("91")) {
        phone = phone.substring(2);
      }
      if (phone.length !== 10) {
        phone = "9999999999";
      }

      const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const request = {
        order_amount: plan.inr,
        order_currency: "INR",
        order_id: orderId,
        customer_details: {
          customer_id: clinic_id,
          customer_phone: phone,
          customer_email: clinic.email || req.user.email || "billing@medienest.care",
          customer_name: clinic.name || "Clinic Owner"
        },
        order_meta: {
          return_url: `${process.env.CLIENT_ORIGIN || "http://localhost:3000"}/portal/clinic-settings?order_id={order_id}`
        }
      };

      const cfResponse = await cashfree.PGCreateOrder(request);

      // Save pending payment record to database
      const { error: dbErr } = await supabase
        .from("processed_payments")
        .insert({
          order_id: orderId,
          amount: plan.paise,
          user_id: req.user.id,
          clinic_id: clinic_id,
          status: "pending"
        });

      if (dbErr) {
        console.error("Failed to insert pending payment:", dbErr.message);
      }

      res.json({
        success: true,
        order_id: orderId,
        payment_session_id: cfResponse.data.payment_session_id
      });
    } catch (err) {
      console.error("Create Order Error:", err.response?.data || err.message);
      res.status(500).json({
        success: false,
        error: "Failed to create payment order. " + (err.response?.data?.message || err.message)
      });
    }
  }
);

app.post(
  "/api/payment/verify",
  requireAuth,
  requireClinicAccess,
  paymentLimiter,
  async (req, res) => {
    try {
      const { order_id } = req.body;
      if (!order_id) {
        return res.status(400).json({ success: false, error: "order_id is required" });
      }

      // Check order status from Cashfree
      const cfResponse = await cashfree.PGFetchOrder(order_id);
      const orderData = cfResponse.data;

      if (orderData.order_status === "PAID") {
        // Retrieve pending payment to get the clinic ID and user ID
        const { data: dbPayment, error: fetchErr } = await supabase
          .from("processed_payments")
          .select("*")
          .eq("order_id", order_id)
          .maybeSingle();

        if (!dbPayment) {
          return res.status(404).json({ success: false, error: "Payment record not found" });
        }

        if (dbPayment.status !== "paid") {
          // Update payment status to paid
          await supabase
            .from("processed_payments")
            .update({
              status: "paid",
              payment_id: orderData.payments?.[0]?.cf_payment_id || null,
              updated_at: new Date().toISOString()
            })
            .eq("order_id", order_id);

          // Determine subscription plan
          const amountInInr = parseFloat(orderData.order_amount);
          let planName = "Starter";
          if (Math.abs(amountInInr - 249.00) < 1.0) planName = "Clinic";
          else if (Math.abs(amountInInr - 499.00) < 1.0) planName = "Professional";

          const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

          // Upsert active subscription
          await supabase
            .from("subscriptions")
            .upsert({
              clinic_id: dbPayment.clinic_id,
              plan_name: planName,
              status: "active",
              start_date: new Date().toISOString(),
              end_date: endDate.toISOString(),
              payment_id: orderData.payments?.[0]?.cf_payment_id || null,
              updated_at: new Date().toISOString()
            }, { onConflict: "clinic_id" });

          // Create audit log
          await supabase
            .from("audit_logs")
            .insert({
              actor_id: req.user.id,
              clinic_id: dbPayment.clinic_id,
              action: "PAYMENT_COMPLETED",
              entity_type: "payments",
              entity_id: dbPayment.id,
              ip_address: req.ip || req.headers['x-forwarded-for'] || ""
            });
        }

        return res.json({
          success: true,
          order_status: "PAID",
          message: "Payment verified successfully"
        });
      } else {
        // Update payment status to failed if Cashfree marked it failed
        if (orderData.order_status === "FAILED") {
          await supabase
            .from("processed_payments")
            .update({
              status: "failed",
              updated_at: new Date().toISOString()
            })
            .eq("order_id", order_id);
        }

        return res.json({
          success: false,
          order_status: orderData.order_status,
          error: "Payment not completed yet"
        });
      }
    } catch (err) {
      console.error("Verify Payment Error:", err.response?.data || err.message);
      res.status(500).json({
        success: false,
        error: "Failed to verify payment. " + (err.response?.data?.message || err.message)
      });
    }
  }
);

app.get(
  "/api/payment/status/:orderId",
  requireAuth,
  async (req, res) => {
    try {
      const { orderId } = req.params;
      const { data: dbPayment, error: fetchErr } = await supabase
        .from("processed_payments")
        .select("*")
        .eq("order_id", orderId)
        .maybeSingle();

      if (fetchErr || !dbPayment) {
        return res.status(404).json({ success: false, error: "Payment record not found" });
      }

      // If the database says paid, we are good to go
      if (dbPayment.status === "paid") {
        return res.json({ success: true, status: "paid", payment: dbPayment });
      }

      // Check Cashfree directly in case the client/webhook hasn't processed it yet
      const cfResponse = await cashfree.PGFetchOrder(orderId);
      const orderData = cfResponse.data;

      if (orderData.order_status === "PAID" && dbPayment.status !== "paid") {
        // Update the payment record and subscription inline
        await supabase
          .from("processed_payments")
          .update({
            status: "paid",
            payment_id: orderData.payments?.[0]?.cf_payment_id || null,
            updated_at: new Date().toISOString()
          })
          .eq("order_id", orderId);

        const amountInInr = parseFloat(orderData.order_amount);
        let planName = "Starter";
        if (Math.abs(amountInInr - 249.00) < 1.0) planName = "Clinic";
        else if (Math.abs(amountInInr - 499.00) < 1.0) planName = "Professional";

        const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        await supabase
          .from("subscriptions")
          .upsert({
            clinic_id: dbPayment.clinic_id,
            plan_name: planName,
            status: "active",
            start_date: new Date().toISOString(),
            end_date: endDate.toISOString(),
            payment_id: orderData.payments?.[0]?.cf_payment_id || null,
            updated_at: new Date().toISOString()
          }, { onConflict: "clinic_id" });

        await supabase
          .from("audit_logs")
          .insert({
            actor_id: dbPayment.user_id,
            clinic_id: dbPayment.clinic_id,
            action: "PAYMENT_COMPLETED",
            entity_type: "payments",
            entity_id: dbPayment.id,
            ip_address: req.ip || req.headers['x-forwarded-for'] || ""
          });

        return res.json({ success: true, status: "paid" });
      }

      res.json({ success: true, status: dbPayment.status });
    } catch (err) {
      console.error("Get Payment Status Error:", err.message);
      res.status(500).json({ success: false, error: "Failed to get payment status" });
    }
  }
);

app.post("/api/payment/webhook", async (req, res) => {
  try {
    const { data } = req.body;
    if (!data || !data.order || !data.order.order_id) {
      return res.status(400).json({ error: "Invalid webhook payload" });
    }
    const orderId = data.order.order_id;
    
    // Query Cashfree directly for the official order state
    const cfResponse = await cashfree.PGFetchOrder(orderId);
    const orderData = cfResponse.data;
    
    if (orderData.order_status === "PAID") {
      const { data: dbPayment, error: fetchErr } = await supabase
        .from("processed_payments")
        .select("*")
        .eq("order_id", orderId)
        .maybeSingle();
        
      if (dbPayment && dbPayment.status !== "paid") {
        await supabase
          .from("processed_payments")
          .update({
            status: "paid",
            payment_id: orderData.payments?.[0]?.cf_payment_id || null,
            updated_at: new Date().toISOString()
          })
          .eq("order_id", orderId);
          
        const amountInInr = parseFloat(orderData.order_amount);
        let planName = "Starter";
        if (Math.abs(amountInInr - 249.00) < 1.0) planName = "Clinic";
        else if (Math.abs(amountInInr - 499.00) < 1.0) planName = "Professional";
        
        const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        
        await supabase
          .from("subscriptions")
          .upsert({
            clinic_id: dbPayment.clinic_id,
            plan_name: planName,
            status: "active",
            start_date: new Date().toISOString(),
            end_date: endDate.toISOString(),
            payment_id: orderData.payments?.[0]?.cf_payment_id || null,
            updated_at: new Date().toISOString()
          }, { onConflict: "clinic_id" });
          
        await supabase
          .from("audit_logs")
          .insert({
            actor_id: dbPayment.user_id,
            clinic_id: dbPayment.clinic_id,
            action: "PAYMENT_COMPLETED",
            entity_type: "payments",
            entity_id: dbPayment.id,
            ip_address: req.ip || req.headers['x-forwarded-for'] || ""
          });
      }
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Webhook Error:", err.message);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

// ─── Basic Health Check ───
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "MedieNest API is running" });
});

app.get("/api/ping", async (req, res) => {
  try {
    // Verify Supabase connectivity
    const { data, error } = await supabase
      .from("medicines")
      .select("count", { count: "exact", head: true });

    if (error) throw error;

    res.json({
      success: true,
      status: "online",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      status: "degraded",
      database: "disconnected",
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// ─── AI SUMMARY (PRODUCTION GRADE) ──────────────────────────────────────────
const aiSummarySchema = z.object({
  lang: z.enum(["English", "Hindi"]).default("English"),
  persist: z
    .union([z.boolean(), z.literal("true"), z.literal("false")])
    .default(true),
});

app.post(
  "/api/prescriptions/:id/ai-summary",
  requireAuth,
  aiLimiter,
  async (req, res) => {
    const { id } = req.params;

    // Validate id format (must be a UUID)
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id,
      )
    ) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid prescription ID format" });
    }

    const parsed = aiSummarySchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res
        .status(400)
        .json({
          success: false,
          error: "Invalid request body",
          details: parsed.error.flatten(),
        });
    }
    const { lang, persist } = parsed.data;

    console.log(
      `[AI] Starting clinical snapshot for Rx: ${id} (Language: ${lang}, Persist: ${persist})`,
    );

    try {
      let rx = req.body || {};
      let patientName = rx.patientName || "Patient";
      let medicines = rx.medicines || [];

      // 1. Fetch Rx Data if incomplete
      if (!rx.complaints || !rx.findings) {
        const { data: dbRx, error: rxError } = await supabase
          .from("prescriptions")
          .select("*, patients(name)")
          .eq("id", id)
          .single();

        if (rxError || !dbRx) throw new Error("Prescription not found");
        rx = dbRx;
        patientName = dbRx.patients?.name || "Patient";
        medicines =
          typeof dbRx.medicines === "string"
            ? JSON.parse(dbRx.medicines)
            : dbRx.medicines;
      }

      // 2. Production Grade Prompt Construction
      const systemRole = `
You are the "Secure AI Agent Record", a specialized clinical assistant. Your goal is to provide a reassuring, safe, and professional recovery guide.

IMPORTANT: RETURN ONLY A PURE JSON OBJECT. NO PREAMBLE. NO GREETINGS. NO INTRODUCTIONS.

AI ROLE:
- You ONLY explain the doctor's prescription. You DO NOT prescribe or guess.

MEDICAL RULES (STRICT):
1. DOSAGE LOGIC: 
   - IF doctor provided dosage/frequency (e.g., "1-0-1", "SOS"): Show EXACT SAME and explain it (e.g., ${lang === "Hindi" ? '"1-0-1 (सुबह-दोपहर-शाम)"' : '"1-0-1 (Morning-Noon-Night)"'}).
   - IF doctor did NOT provide dosage: DO NOT GUESS. Show: ${lang === "Hindi" ? '"डॉक्टर के अनुसार लें"' : '"As directed by doctor"'}.
2. FORBIDDEN: NEVER suggest "Twice a day", "Morning/Night", or "5 days" unless explicitly provided in the INPUT med list.
3. PROTOCOLS: If Dengue/Viral detected, prioritize hydration and bleeding warning signs.

TONE & STYLE:
- Warm, encouraging, supportive in ${lang}.
- Use specific emojis: , ⏳, , , .

JSON OUTPUT FORMAT:
{
  "greeting": "Hello ${patientName}",
  "condition": "Explanation of the illness in ${lang}",
  "medicines": [
    {
      "name": "Medicine name in ${lang}",
      "purpose": "Purpose of medicine in ${lang}",
      "dosage": "Exact dosage from input + explanation ${lang === "Hindi" ? "(e.g. 1-0-1 (सुबह-दोपहर-शाम))" : "(e.g. 1-0-1 (Morning-Noon-Night))"} OR ${lang === "Hindi" ? "डॉक्टर के अनुसार लें" : "As directed by doctor"}"
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
- Diagnosis: ${rx.diagnosis || "N/A"}
- Findings (O/E): ${rx.findings || "N/A"}
- Symptoms: ${rx.complaints || "N/A"}
- Medicines: ${JSON.stringify(medicines)}
- Advice: ${rx.advice}
- Follow-up Date: ${rx.followUp || rx.valid_till || "N/A"}
`;

      let summaryJson = null;
      let attempts = 0;
      const maxAttempts = 2;

      while (attempts < maxAttempts && !summaryJson) {
        attempts++;
        console.log(
          `[AI] Generation attempt ${attempts}/${maxAttempts} for ${lang}...`,
        );

        let content = "";
        try {
          content = await askLLM(
            [{ role: "user", content: userPrompt }],
            systemRole,
            1200
          );
        } catch (aiErr) {
          console.error(`[AI ERROR] askLLM failed:`, aiErr.message);
          if (attempts === maxAttempts) {
            throw new Error("AI Service unavailable. " + aiErr.message);
          }
          continue;
        }

        try {
          // 1. Standardize cleanup for control characters
          content = content.replace(/[\u0000-\u001F\u007F-\u009F\uFFFD]/g, "");

          // 2. Locate the JSON block
          const firstBrace = content.indexOf("{");
          const lastBrace = content.lastIndexOf("}");

          if (firstBrace === -1 || lastBrace === -1) {
            throw new Error("No JSON object found in AI response");
          }

          let jsonStr = content.substring(firstBrace, lastBrace + 1);

          // 3. Aggressive Sanitization: Replace literal newlines and tabs with spaces
          // This is the most common cause of JSON.parse failures in LLM outputs
          jsonStr = jsonStr
            .replace(/\n/g, " ")
            .replace(/\r/g, " ")
            .replace(/\t/g, " ");

          const parsed = JSON.parse(jsonStr);

          // VALIDATION: If lang is Hindi, check if it's pure Hindi
          if (lang === "Hindi") {
            const isPure =
              isValidHindi(parsed.condition) && isValidHindi(parsed.care);
            if (!isPure && attempts < maxAttempts) {
              console.warn(
                `️ [AI] Language mix detected in Hindi output. Retrying...`,
              );
              continue;
            }
          }

          summaryJson = parsed;
        } catch (pErr) {
          console.error(
            `️ [AI] JSON Extraction failed on attempt ${attempts}: ${pErr.message}`,
          );
          console.log("--- FAILED CONTENT ---");
          console.log(content);
          console.log("----------------------");
          if (attempts === maxAttempts) throw pErr;
        }
      }

      // 3. Persist and Return
      if (persist === true || persist === "true") {
        await supabase
          .from("prescriptions")
          .update({ ai_summary: summaryJson })
          .eq("id", id);
      }

      res.json({ success: true, summary: summaryJson });
    } catch (err) {
      console.error(`[AI ERROR]:`, err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  },
);

// ─── PUBLIC DOCTOR PROFILE (Patient-Facing, No Private Info) ─────────
app.get("/api/doctor-profile/:doctorId", async (req, res) => {
  const { doctorId } = req.params;
  try {
    const { data, error } = await supabase
      .from("doctors")
      .select(
        "name, qualification, specialty, registration_number, profile_photo_url",
      )
      .eq("id", doctorId)
      .single();

    if (error || !data) {
      return res
        .status(404)
        .json({ success: false, error: "Doctor not found" });
    }

    res.json({
      success: true,
      doctor: {
        name: data.name,
        qualification: data.qualification || "MBBS",
        specialty: data.specialty || "General Consultant",
        registration_number: data.registration_number || "N/A",
        profile_photo_url: data.profile_photo_url || null,
      },
    });
  } catch (err) {
    console.error("Doctor Profile Error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── PUBLIC DOCTOR PROFILE BY PRESCRIPTION ID ─────────
app.get("/api/doctor-profile-by-rx/:rxId", async (req, res) => {
  const { rxId } = req.params;
  try {
    // Step 1: Get doctor_id from prescription
    const { data: rx, error: rxErr } = await supabase
      .from("prescriptions")
      .select("doctor_id, doctor_name")
      .eq("id", rxId)
      .single();

    if (rxErr || !rx) {
      return res
        .status(404)
        .json({ success: false, error: "Prescription not found" });
    }

    // Step 2: Fetch doctor details
    if (rx.doctor_id) {
      const { data, error } = await supabase
        .from("doctors")
        .select(
          "name, qualification, specialty, registration_number, profile_photo_url",
        )
        .eq("id", rx.doctor_id)
        .single();

      if (!error && data) {
        return res.json({
          success: true,
          doctor: {
            name: data.name,
            qualification: data.qualification || "MBBS",
            specialty: data.specialty || "General Consultant",
            registration_number: data.registration_number || "N/A",
            profile_photo_url: data.profile_photo_url || null,
          },
        });
      }
    }

    // Fallback: use doctor_name from prescription
    res.json({
      success: true,
      doctor: {
        name: rx.doctor_name || "Consulting Doctor",
        qualification: "MBBS",
        specialty: "General Consultant",
        registration_number: "N/A",
        profile_photo_url: null,
      },
    });
  } catch (err) {
    console.error("Doctor Profile by Rx Error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- GLOBAL JSON ERROR HANDLER ---
app.use((req, res, next) => {
  res.status(404).json({ success: false, error: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error("Global Error:", err.stack);
  res
    .status(500)
    .json({
      success: false,
      error: "Internal Server Error",
      details: err.message,
    });
});

// ─── Start Server ───
const startServer = (port) => {
  app
    .listen(port, () => {
      console.log(`[AI 4/4] MedieNest API is LIVE on port ${port}`);
    })
    .on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.error(
          `Port ${port} is occupied. Please kill the process manually.`,
        );
        process.exit(1);
      } else {
        console.error("Server Error:", err);
      }
    });
};

startServer(PORT);
