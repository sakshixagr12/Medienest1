const express = require('express');
const router = express.Router();
const { supabase } = require('../supabaseClient');

router.get('/', async (req, res) => {
    const { clinic_id } = req.query;
    if (!clinic_id) {
        return res.status(400).json({ success: false, error: 'clinic_id is required' });
    }

    try {
        // 1. Fetch latest 5 patient registrations
        const { data: recentPatients, error: patientError } = await supabase
            .from('patients')
            .select('id, name, created_at')
            .eq('clinic_id', clinic_id)
            .order('created_at', { ascending: false })
            .limit(5);

        if (patientError) throw patientError;

        // 2. Fetch latest 5 prescriptions
        const { data: recentPrescriptions, error: prescriptionError } = await supabase
            .from('prescriptions')
            .select('id, created_at, patients(name)')
            .eq('clinic_id', clinic_id)
            .order('created_at', { ascending: false })
            .limit(5);

        if (prescriptionError) throw prescriptionError;

        // 3. Transform into unified notifications
        const notifications = [
            ...(recentPatients || []).map(p => ({
                id: `reg-${p.id}`,
                title: 'New Patient Registration',
                desc: `${p.name} has been registered in the front office.`,
                time: p.created_at,
                icon: 'person_add',
                bg: '#ebdcff'
            })),
            ...(recentPrescriptions || []).map(rx => ({
                id: `pres-${rx.id}`,
                title: 'Prescription Generated',
                desc: `Clinical record completed for ${rx.patients?.name || 'a patient'}.`,
                time: rx.created_at,
                icon: 'description',
                bg: '#eaddf9'
            }))
        ];

        // 4. Sort all by time descending
        notifications.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

        // Return top 7 overall
        res.json({
            success: true,
            data: notifications.slice(0, 7)
        });

    } catch (err) {
        console.error('❌ Notification Error:', err.message);
        res.status(500).json({ success: false, error: 'Failed to fetch notifications', details: err.message });
    }
});

module.exports = router;
