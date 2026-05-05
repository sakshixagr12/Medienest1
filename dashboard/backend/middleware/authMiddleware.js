const { supabase } = require('../supabaseClient');

const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify token directly against Supabase Auth API
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.error('❌ Auth Error:', error?.message);
      return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('❌ Middleware Error:', err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

const requireClinicAccess = async (req, res, next) => {
  // Extract clinic_id from query or body
  const clinic_id = req.query.clinic_id || req.body.clinic_id;
  
  if (!clinic_id) {
    return res.status(400).json({ success: false, error: 'clinic_id is required' });
  }

  try {
    // We confirm this user owns the given clinic.
    // If you have a 'clinic_doctors' map for doctors who aren't owners,
    // you would check that table here as well. For now, strictly owner scoped.
    const { data: clinic, error } = await supabase
      .from('clinics')
      .select('id')
      .eq('id', clinic_id)
      .eq('owner_user_id', req.user.id)
      .maybeSingle();

    if (error) {
      console.error('❌ Clinic Access Check Error:', error.message);
      return res.status(500).json({ success: false, error: 'Database check failed' });
    }

    if (!clinic) {
      return res.status(403).json({ success: false, error: 'Forbidden: You do not have access to this clinic' });
    }

    // Access granted
    next();
  } catch (err) {
    console.error('❌ Middleware Clinic Error:', err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

module.exports = { requireAuth, requireClinicAccess };
