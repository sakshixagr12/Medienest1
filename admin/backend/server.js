require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 4002;

// Supabase Initialization
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceRole);

// Middleware
app.use(cors({
    origin: '*'
}));
app.use(express.json());

// ─── Basic Health Check ───
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'MediNest SuperAdmin Backend is running' });
});

// ─── SUPER ADMIN MIDDLEWARE ───
const requireSuperAdmin = (req, res, next) => {
    const providedKey = req.headers['x-admin-key'] || '';
    const actualKey = (process.env.ADMIN_PASSWORD || '').trim();
    
    console.log(`📡 [ADMIN REQ] ${req.method} ${req.path}`);
    
    if (providedKey !== actualKey) {
        console.warn(`⛔ [AUTH FAIL] ${req.method} ${req.path}`);
        console.log(`   - Provided: "${providedKey.substring(0, 3)}..." [len: ${providedKey.length}]`);
        console.log(`   - Expected: "${actualKey.substring(0, 3)}..." [len: ${actualKey.length}]`);
        console.log(`   - Environment Var Loaded: ${process.env.ADMIN_PASSWORD ? 'YES' : 'NO'}`);
        return res.status(401).json({ success: false, error: 'Unauthorized: Invalid Admin Key' });
    }
    next();
};

// ─── SUPER ADMIN ENDPOINTS ───

// 1. Get all clinics and their doctors
app.get('/api/clinics', requireSuperAdmin, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('clinics')
            .select('*, clinic_doctors(*, doctors(*))')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 2. Approve or Suspend a clinic
app.post('/api/clinics/status', requireSuperAdmin, async (req, res) => {
    const { clinicId, status } = req.body;
    console.log('📬 Status Update Request:', { clinicId, status });
    
    if (!clinicId || !['active', 'suspended'].includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid parameters' });
    }

    try {
        const approvedAt = status === 'active' ? new Date().toISOString() : null;
        const { error } = await supabase
            .from('clinics')
            .update({ status, approved_at: approvedAt })
            .eq('id', clinicId);

        if (error) {
            console.error('❌ Supabase Update Error:', error);
            throw error;
        }
        res.json({ success: true, message: `Clinic status updated to ${status}` });
    } catch (err) {
        console.error('❌ Status Update Backend Error:', err.message);
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

app.listen(PORT, () => {
    console.log(`🚀 SuperAdmin Backend running on http://localhost:${PORT}`);
});
