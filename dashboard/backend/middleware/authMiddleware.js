const { supabase } = require("../supabaseClient");

const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({
          success: false,
          error: "Missing or invalid Authorization header",
        });
    }

    const token = authHeader.split(" ")[1];

    // Verify token directly against Supabase Auth API
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    // Verify token expiration if available via JWT claims (Supabase embeds exp claim)
    // Decode JWT payload without verification (safe for expiration check only)
    const jwtPayload = token.split('.')[1];
    const decoded = Buffer.from(jwtPayload, 'base64').toString('utf8');
    const payloadObj = JSON.parse(decoded);
    const nowSec = Math.floor(Date.now() / 1000);
    if (payloadObj.exp && payloadObj.exp < nowSec) {
      return res
        .status(401)
        .json({ success: false, error: "Unauthorized: Token expired" });
    }

    if (error || !user) {
      console.error("Auth Error:", error?.message);
      return res
        .status(401)
        .json({ success: false, error: "Unauthorized: Invalid token" });
    }

    // Ensure email is verified
    if (!user.email_confirmed_at && !(user.app_metadata && user.app_metadata.email_verified)) {
      return res
        .status(403)
        .json({ success: false, error: "Email not verified" });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("Middleware Error:", err);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

const requireClinicAccess = async (req, res, next) => {
  // Extract clinic_id from query or body
  const clinic_id = req.query.clinic_id || req.body.clinic_id || req.body.receiptData?.clinic_id;

  if (!clinic_id) {
    return res
      .status(400)
      .json({ success: false, error: "clinic_id is required" });
  }

  // Ensure clinic_id is present at req.body for downstream route handlers
  if (req.body && typeof req.body === "object" && !req.body.clinic_id) {
    req.body.clinic_id = clinic_id;
  }

  try {
    // 1. Check if the user is the clinic owner
    const { data: clinic, error: clinicError } = await supabase
      .from("clinics")
      .select("id")
      .eq("id", clinic_id)
      .eq("owner_user_id", req.user.id)
      .maybeSingle();

    if (clinicError) {
      console.error("Clinic Access Check Error:", clinicError.message);
      return res
        .status(500)
        .json({ success: false, error: "Database check failed" });
    }

    if (clinic) {
      // User is the owner, access granted
      return next();
    }

    // 2. Fallback: Check if user is a doctor mapped to this clinic in clinic_doctors
    const { data: doctor, error: docError } = await supabase
      .from("doctors")
      .select("id")
      .eq("user_id", req.user.id)
      .maybeSingle();

    if (docError) {
      console.error("Doctor lookup error:", docError.message);
      return res
        .status(500)
        .json({ success: false, error: "Database check failed" });
    }

    if (doctor) {
      const { data: clinicDoctor, error: junctionError } = await supabase
        .from("clinic_doctors")
        .select("id")
        .eq("clinic_id", clinic_id)
        .eq("doctor_id", doctor.id)
        .eq("is_active", true)
        .maybeSingle();

      if (junctionError) {
        console.error("Clinic-Doctor junction error:", junctionError.message);
        return res
          .status(500)
          .json({ success: false, error: "Database check failed" });
      }

      if (clinicDoctor) {
        // User is an active doctor in this clinic, access granted
        return next();
      }
    }

    // Neither owner nor active staff doctor
    return res
      .status(403)
      .json({
        success: false,
        error: "Forbidden: You do not have access to this clinic",
      });
  } catch (err) {
    console.error("Middleware Clinic Error:", err);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

module.exports = { requireAuth, requireClinicAccess };
// Trigger reload 3
