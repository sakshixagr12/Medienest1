const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 4002;

// Supabase Initialization
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("[STARTUP] SUPABASE_URL:", supabaseUrl ? "Loaded" : "MISSING");
console.log(
  "[STARTUP] SUPABASE_SERVICE_ROLE_KEY:",
  supabaseServiceRole
    ? `Loaded (length: ${supabaseServiceRole.length})`
    : "MISSING",
);

const supabase = createClient(supabaseUrl, supabaseServiceRole);

// Middleware
app.use(
  cors({
    origin: "*",
  }),
);
app.use(express.json());

// ─── Basic Health Check ───
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "MedieNest SuperAdmin Backend is running" });
});

// ─── SUPER ADMIN MIDDLEWARE ───
const requireSuperAdmin = (req, res, next) => {
  console.log(`[ADMIN REQ] ${req.method} ${req.path}`);
  next();
};

// ─── SUPER ADMIN ENDPOINTS ───

// 1. Get all clinics and their doctors
app.get("/api/clinics", requireSuperAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("clinics")
      .select("*, clinic_doctors(*, doctors(*))")
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Approve or Suspend a clinic
app.post("/api/clinics/status", requireSuperAdmin, async (req, res) => {
  const { clinicId, status } = req.body;
  console.log("Status Update Request:", { clinicId, status });

  if (!clinicId || !["active", "suspended"].includes(status)) {
    return res
      .status(400)
      .json({ success: false, error: "Invalid parameters" });
  }

  try {
    const { error } = await supabase
      .from("clinics")
      .update({ status })
      .eq("id", clinicId);

    if (error) {
      console.error("Supabase Update Error:", error);
      throw error;
    }
    res.json({ success: true, message: `Clinic status updated to ${status}` });
  } catch (err) {
    console.error("Status Update Backend Error:", err.message);
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

app.listen(PORT, () => {
  console.log(`SuperAdmin Backend running on http://localhost:${PORT}`);
});
