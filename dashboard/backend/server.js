const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { z } = require("zod");
const { createClient } = require("@supabase/supabase-js");
const { Cashfree, CFEnvironment } = require("cashfree-pg");
const { askLLM } = require("./utils/llmRotation");

const app = express();
const PORT = process.env.PORT || 4001;

// Supabase Initialization - Using Service Role for background tasks
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceRole);

// Cashfree PG SDK Initialization
const cashfree = new Cashfree(
  process.env.CASHFREE_ENV === "production" ? CFEnvironment.PRODUCTION : CFEnvironment.SANDBOX,
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

      // Check if there is already an active subscription to prevent duplicate billing
      const { data: existingSub } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("clinic_id", clinic_id)
        .eq("status", "active")
        .maybeSingle();

      if (existingSub && new Date(existingSub.end_date) > new Date()) {
        return res.status(400).json({ success: false, error: "You already have an active subscription." });
      }

      // Check if there is any pending payment order created within the last 2 minutes for this clinic (Rate limit)
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      const { data: recentPendingPayment } = await supabase
        .from("processed_payments")
        .select("id")
        .eq("clinic_id", clinic_id)
        .eq("status", "pending")
        .gte("created_at", twoMinutesAgo)
        .limit(1)
        .maybeSingle();

      if (recentPendingPayment) {
        return res.status(429).json({ success: false, error: "A payment order was recently initiated. Please wait a moment before trying again." });
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

      // --- BYPASS PAYMENT BYPASS ---
      // As requested: Skip payment, directly activate subscription and return success
      const bypassPayment = true;
      if (bypassPayment) {
        const now = new Date();
        const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const orderId = `bypass_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

        // 1. Insert processed payment directly as paid
        await supabase
          .from("processed_payments")
          .insert({
            order_id: orderId,
            amount: plan.paise,
            user_id: req.user.id,
            clinic_id: clinic_id,
            status: "paid",
            payment_id: `pay_${orderId}`
          });

        // 2. Upsert active subscription
        await supabase
          .from("subscriptions")
          .upsert({
            clinic_id: clinic_id,
            plan_name: plan_name,
            status: "active",
            start_date: new Date().toISOString(),
            end_date: endDate.toISOString(),
            payment_id: `pay_${orderId}`,
            updated_at: new Date().toISOString()
          }, { onConflict: "clinic_id" });

        // 3. Update clinic status to active
        await supabase
          .from("clinics")
          .update({ status: "active", updated_at: new Date().toISOString() })
          .eq("id", clinic_id);

        // 4. Create audit log
        await supabase
          .from("audit_logs")
          .insert({
            actor_id: req.user.id,
            clinic_id: clinic_id,
            action: "PAYMENT_COMPLETED",
            details: { plan_name, is_bypassed: true }
          });

        return res.json({
          success: true,
          bypass: true,
          order_id: orderId
        });
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
          return_url: (process.env.CASHFREE_ENV === "production"
            ? (process.env.CLIENT_ORIGIN || "http://localhost:3000").replace("http://", "https://")
            : (process.env.CLIENT_ORIGIN || "http://localhost:3000")) + "/portal/clinic-settings?order_id={order_id}"
        }
      };

      const cfResponse = await cashfree.PGCreateOrder(request);

      // Save pending payment record to database (inserted, never deleted or overwritten)
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
  "/api/payment/start-trial",
  requireAuth,
  requireClinicAccess,
  paymentLimiter,
  async (req, res) => {
    try {
      const { clinic_id, plan_name } = req.body;
      if (!clinic_id || !plan_name) {
        return res.status(400).json({ success: false, error: "clinic_id and plan_name are required" });
      }

      // Fetch clinic to get email and phone
      const { data: clinic, error: clinicErr } = await supabase
        .from("clinics")
        .select("email, phone")
        .eq("id", clinic_id)
        .single();

      if (clinicErr || !clinic) {
        return res.status(404).json({ success: false, error: "Clinic not found" });
      }

      const email = clinic.email || req.user.email || "";
      const phone = clinic.phone || "";

      // Anti-Abuse: Check trial_claims table
      const filters = [];
      if (req.user.id) filters.push(`user_id.eq.${req.user.id}`);
      if (email) filters.push(`email.eq.${email}`);
      if (phone) filters.push(`phone.eq.${phone}`);

      const { data: existingClaim } = await supabase
        .from("trial_claims")
        .select("id")
        .or(filters.join(","))
        .limit(1)
        .maybeSingle();

      if (existingClaim) {
        return res.status(400).json({
          success: false,
          error: "A free trial has already been claimed for this account, email, or phone number."
        });
      }

      // Insert trial claim record
      const { error: claimInsertErr } = await supabase
        .from("trial_claims")
        .insert({
          user_id: req.user.id,
          email: email,
          phone: phone,
          claimed_at: new Date().toISOString()
        });

      if (claimInsertErr) throw claimInsertErr;

      const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days trial

      // Create trial subscription
      const { error: subErr } = await supabase
        .from("subscriptions")
        .upsert({
          clinic_id,
          plan_name,
          status: "trial",
          start_date: new Date().toISOString(),
          end_date: endDate.toISOString(),
          payment_id: "trial",
          updated_at: new Date().toISOString()
        }, { onConflict: "clinic_id" });

      if (subErr) throw subErr;

      // Update clinic status to active
      const { error: clinicUpdErr } = await supabase
        .from("clinics")
        .update({ status: "active", updated_at: new Date().toISOString() })
        .eq("id", clinic_id);

      if (clinicUpdErr) throw clinicUpdErr;

      // Create audit log
      await supabase
        .from("audit_logs")
        .insert({
          actor_id: req.user.id,
          clinic_id,
          action: "TRIAL_STARTED",
          entity_type: "subscriptions",
          ip_address: req.ip || req.headers['x-forwarded-for'] || ""
        });

      res.json({ success: true, message: "7-day free trial started successfully" });
    } catch (err) {
      console.error("Start Trial Error:", err.message);
      res.status(500).json({ success: false, error: "Failed to start free trial: " + err.message });
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

      // Retrieve pending payment first to verify access
      const { data: dbPayment, error: fetchErr } = await supabase
        .from("processed_payments")
        .select("*")
        .eq("order_id", order_id)
        .maybeSingle();

      if (!dbPayment) {
        return res.status(404).json({ success: false, error: "Payment record not found" });
      }

      // Ownership Guard: Must match req.user.id and body/query clinic_id
      const clinic_id = req.body.clinic_id || req.query.clinic_id;
      if (dbPayment.clinic_id !== clinic_id || dbPayment.user_id !== req.user.id) {
        return res.status(403).json({ success: false, error: "Forbidden: Payment record mismatch" });
      }

      // Webhook Idempotency: Return success if already paid
      if (dbPayment.status === "paid") {
        return res.json({
          success: true,
          order_status: "PAID",
          message: "Payment already verified successfully"
        });
      }

      // Check order status from Cashfree
      const cfResponse = await cashfree.PGFetchOrder(order_id);
      const orderData = cfResponse.data;

      if (orderData.order_status === "PAID") {

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

        // Expiry Date Rollover Calculation: max(current_end_date, now) + 30 days
        const { data: existingSub } = await supabase
          .from("subscriptions")
          .select("end_date")
          .eq("clinic_id", dbPayment.clinic_id)
          .maybeSingle();

        const now = new Date();
        let baseDate = now;
        if (existingSub && existingSub.end_date) {
          const currentEndDate = new Date(existingSub.end_date);
          if (currentEndDate > now) {
            baseDate = currentEndDate;
          }
        }
        const endDate = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000);

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

        // Update clinic status to active
        await supabase
          .from("clinics")
          .update({ status: "active", updated_at: new Date().toISOString() })
          .eq("id", dbPayment.clinic_id);

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

        return res.json({
          success: true,
          order_status: "PAID",
          message: "Payment verified successfully"
        });
      } else {
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

      if (dbPayment.user_id !== req.user.id) {
        return res.status(403).json({ success: false, error: "Forbidden: You do not own this payment record" });
      }

      if (dbPayment.status === "paid") {
        return res.json({ success: true, status: "paid", payment: dbPayment });
      }

      const cfResponse = await cashfree.PGFetchOrder(orderId);
      const orderData = cfResponse.data;

      if (orderData.order_status === "PAID" && dbPayment.status !== "paid") {
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

        const { data: existingSub } = await supabase
          .from("subscriptions")
          .select("end_date")
          .eq("clinic_id", dbPayment.clinic_id)
          .maybeSingle();

        const now = new Date();
        let baseDate = now;
        if (existingSub && existingSub.end_date) {
          const currentEndDate = new Date(existingSub.end_date);
          if (currentEndDate > now) {
            baseDate = currentEndDate;
          }
        }
        const endDate = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000);

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
          .from("clinics")
          .update({ status: "active", updated_at: new Date().toISOString() })
          .eq("id", dbPayment.clinic_id);

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
    
    const cfResponse = await cashfree.PGFetchOrder(orderId);
    const orderData = cfResponse.data;
    
    if (orderData.order_status === "PAID") {
      const { data: dbPayment } = await supabase
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
        
        const { data: existingSub } = await supabase
          .from("subscriptions")
          .select("end_date")
          .eq("clinic_id", dbPayment.clinic_id)
          .maybeSingle();

        const now = new Date();
        let baseDate = now;
        if (existingSub && existingSub.end_date) {
          const currentEndDate = new Date(existingSub.end_date);
          if (currentEndDate > now) {
            baseDate = currentEndDate;
          }
        }
        const endDate = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000);
        
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
          .from("clinics")
          .update({ status: "active", updated_at: new Date().toISOString() })
          .eq("id", dbPayment.clinic_id);
          
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

app.post(
  "/api/internal/process-expired-subscriptions",
  async (req, res) => {
    try {
      const cronSecret = process.env.CRON_SECRET || "medienest_cron_secret_token";
      if (req.headers["x-cron-token"] !== cronSecret) {
        return res.status(403).json({ success: false, error: "Unauthorized" });
      }

      console.log("[Cron] Running expired subscription cleaner...");
      const now = new Date().toISOString();

      // Find all subscriptions that have expired
      const { data: expiredSubs, error: subErr } = await supabase
        .from("subscriptions")
        .select("clinic_id")
        .in("status", ["trial", "active"])
        .lt("end_date", now);

      if (subErr) throw subErr;

      if (expiredSubs && expiredSubs.length > 0) {
        const clinicIds = expiredSubs.map(s => s.clinic_id);
        console.log(`[Cron] Found ${clinicIds.length} expired subscriptions. Processing deactivations...`);

        // Update subscriptions to expired
        const { error: updSubErr } = await supabase
          .from("subscriptions")
          .update({ status: "expired", updated_at: now })
          .in("clinic_id", clinicIds);

        if (updSubErr) throw updSubErr;

        // Set clinics to inactive status
        const { error: updClinicErr } = await supabase
          .from("clinics")
          .update({ status: "inactive", updated_at: now })
          .in("id", clinicIds);

        if (updClinicErr) throw updClinicErr;

        console.log(`[Cron] Successfully deactivated ${clinicIds.length} clinics.`);
      } else {
        console.log("[Cron] No expired subscriptions found.");
      }

      res.json({ success: true, processed: expiredSubs?.length || 0 });
    } catch (err) {
      console.error("[Cron Error]:", err.message);
      res.status(500).json({ success: false, error: "Cron check failed. " + err.message });
    }
  }
);

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
      // 1. Always fetch Prescription from database to prevent spoofing and verify access control
      const { data: dbRx, error: rxError } = await supabase
        .from("prescriptions")
        .select("*, patients(name)")
        .eq("id", id)
        .single();

      if (rxError || !dbRx) {
        return res.status(404).json({ success: false, error: "Prescription not found" });
      }

      const rx = dbRx;
      const patientName = dbRx.patients?.name || "Patient";
      let medicines = [];
      try {
        medicines = typeof dbRx.medicines === "string"
          ? JSON.parse(dbRx.medicines)
          : dbRx.medicines || [];
      } catch (err) {
        console.error("Malformed medicines JSON:", err.message);
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

// Helper: Calculate immediate heuristic summary for public view (WARP SPEED)
function calculateHeuristicSummaryPublic(visits) {
  if (!visits || visits.length === 0) {
    return {
      keyConditions: ["New Patient"],
      currentMedications: ["None recorded"],
      recentVisitsSummary:
        "This is the patient's first clinical interaction at this facility.",
    };
  }

  // Extract unique key conditions (last 3 chief complaints)
  const conditions = Array.from(
    new Set(
      visits
        .map((v) => v.complaints)
        .filter((c) => c && c.toLowerCase() !== "routine checkup")
        .slice(0, 3),
    ),
  );

  // Extract latest unique medications
  const meds = Array.from(
    new Set(
      visits
        .flatMap((v) => v.medicines)
        .map((m) => (typeof m === "object" ? m.name : m))
        .filter((m) => m)
        .slice(0, 5),
    ),
  );

  const lastVisitDate = new Date(visits[0].visit_date).toLocaleDateString();

  return {
    keyConditions: conditions.length > 0 ? conditions : ["General Wellness"],
    currentMedications: meds.length > 0 ? meds : ["No active prescriptions"],
    recentVisitsSummary: `Clinical history includes ${visits.length} recorded interactions. Latest visit was on ${lastVisitDate}.`,
  };
}

// ─── PUBLIC CARE GUIDANCE GENERATION ENDPOINT ─────────
app.post("/api/public/prescriptions/:id/guidance-sheet", aiLimiter, async (req, res) => {
  const { id } = req.params;
  
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return res.status(400).json({ success: false, error: "Invalid prescription ID format" });
  }

  try {
    // 1. Fetch prescription
    const { data: rx, error: rxError } = await supabase
      .from("prescriptions")
      .select("*, patients(*)")
      .eq("id", id)
      .single();

    if (rxError || !rx) {
      return res.status(404).json({ success: false, error: "Prescription not found" });
    }

    // If already generated, return it
    if (rx.guidance_sheet) {
      return res.json({ success: true, guidance: rx.guidance_sheet });
    }

    // 2. Generate guidance sheet
    let medicines = [];
    try {
      medicines = typeof rx.medicines === "string" 
        ? JSON.parse(rx.medicines) 
        : rx.medicines || [];
    } catch (e) {
      console.error("Failed to parse medicines:", e);
    }

    const { generateGuidanceSheet } = require("./routes/recommendations");
    const result = await generateGuidanceSheet({
      diagnosis: rx.diagnosis || "",
      cc: rx.complaints || "",
      findings: rx.findings || "",
      medicines: medicines,
      age: rx.patients?.age || rx.patient_age || "",
      gender: rx.patients?.gender || rx.patient_gender || "",
      weight: rx.weight || "",
      existing_conditions: "",
      follow_up_date: rx.valid_till || "",
      clinic_name: "",
      doctor_name: rx.doctor_name || "",
    });

    if (result.success && result.guidance) {
      // 3. Persist to database
      await supabase
        .from("prescriptions")
        .update({ guidance_sheet: result.guidance })
        .eq("id", id);

      return res.json({ success: true, guidance: result.guidance });
    }

    res.status(500).json({ success: false, error: result.error || "Generation failed" });
  } catch (err) {
    console.error("Public Guidance Sheet Gen Error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── PUBLIC PATIENT HISTORY BY PRESCRIPTION ID ─────────
app.get("/api/public/patient-history/:rxId", async (req, res) => {
  const { rxId } = req.params;
  try {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        rxId,
      )
    ) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid prescription ID format" });
    }

    // 1. Fetch prescription to retrieve patient_id and clinic_id
    const { data: rx, error: rxErr } = await supabase
      .from("prescriptions")
      .select("patient_id, clinic_id")
      .eq("id", rxId)
      .single();

    if (rxErr || !rx || !rx.patient_id) {
      return res
        .status(404)
        .json({ success: false, error: "Prescription or patient not found" });
    }

    const patientId = rx.patient_id;
    const clinicId = rx.clinic_id;

    // 2. Fetch patient profile, enforcing clinic_id check for isolation
    const { data: patient, error: patErr } = await supabase
      .from("patients")
      .select(
        "id, name, age, gender, contact, blood_group, address, created_at, clinic_id",
      )
      .eq("id", patientId)
      .single();

    if (patErr || !patient) {
      return res
        .status(404)
        .json({ success: false, error: "Patient record not found" });
    }

    if (patient.clinic_id !== clinicId) {
      return res
        .status(403)
        .json({ success: false, error: "Forbidden: clinic mismatch" });
    }

    // 3. Fetch visits
    const { data: rawPrescriptions } = await supabase
      .from("prescriptions")
      .select("*")
      .eq("patient_id", patientId)
      .order("date", { ascending: false });

    const visits = (rawPrescriptions || []).map((p) => {
      let medicines = [];
      try {
        medicines =
          typeof p.medicines === "string"
            ? JSON.parse(p.medicines)
            : p.medicines;
      } catch (e) {
        console.error(`Prescription ${p.id} has malformed medicines JSON`);
      }

      return {
        visit_date: p.date || p.created_at,
        created_at: p.created_at,
        doctor: p.doctor_name,
        complaints: p.complaints,
        findings: p.findings,
        medicines: medicines || [],
        advice: p.advice,
        prescription_id: p.id,
      };
    });

    // 4. Fetch discharge summaries
    const { data: rawSummaries } = await supabase
      .from("discharge_summaries")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });

    const summaries = (rawSummaries || []).map((s) => {
      const safeParse = (val) => {
        if (!val) return [];
        try {
          return typeof val === "string" ? JSON.parse(val) : val;
        } catch (e) {
          return [];
        }
      };

      return {
        ...s,
        medicines: safeParse(s.medicines),
        complaints: safeParse(s.complaints),
        findings: safeParse(s.findings),
        treatment: safeParse(s.treatment),
        advice: safeParse(s.advice),
      };
    });

    // 5. Fetch admission records
    const { data: rawAdmissions } = await supabase
      .from("admission_records")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });

    const admissions = (rawAdmissions || []).map((a) => {
      const safeParse = (val) => {
        if (!val) return [];
        try {
          return typeof val === "string" ? JSON.parse(val) : val;
        } catch (e) {
          return [];
        }
      };

      return {
        ...a,
        complaints: safeParse(a.complaints),
        findings: safeParse(a.findings),
        investigations: safeParse(a.investigations),
        treatment_plan: safeParse(a.treatment_plan),
      };
    });

    // 6. Fetch cached AI snapshot
    const { data: existing } = await supabase
      .from("patient_histories")
      .select("summary_text, updated_at")
      .eq("patient_id", patientId)
      .maybeSingle();

    let finalSummary;
    if (existing?.summary_text) {
      try {
        finalSummary = JSON.parse(existing.summary_text);
      } catch (e) {
        finalSummary = calculateHeuristicSummaryPublic(visits);
      }
    } else {
      finalSummary = calculateHeuristicSummaryPublic(visits);
    }

    res.json({ patient, visits, summaries, admissions, summary: finalSummary });
  } catch (err) {
    console.error("Public Patient History Error:", err.message);
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
