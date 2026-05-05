-- ==========================================
-- 10. PERMISSIONS: CLINICAL ACCESS
-- Ensures all clinical tables are accessible by the clinic staff
-- ==========================================

-- 1. Patients Table Grants
GRANT ALL ON TABLE patients TO authenticated;
GRANT ALL ON TABLE patients TO service_role;

-- 2. Doctor Queue Grants
GRANT ALL ON TABLE doctor_queue TO authenticated;
GRANT ALL ON TABLE doctor_queue TO service_role;

-- 3. Clinical Records (Prescriptions)
GRANT ALL ON TABLE prescriptions TO authenticated;
GRANT ALL ON TABLE prescriptions TO service_role;

-- 4. Financial Records (Receipts)
GRANT ALL ON TABLE receipts TO authenticated;
GRANT ALL ON TABLE receipts TO service_role;

-- 5. Medicines (Global Registry)
-- Usually read-only for clinics, but staff might need to suggest new ones
GRANT ALL ON TABLE medicines TO authenticated;
GRANT ALL ON TABLE medicines TO service_role;

-- 6. Ensure schema usage is allowed
GRANT USAGE ON SCHEMA public TO anon, authenticated;

COMMENT ON TABLE patients IS 'Permissions granted to authenticated users for clinical check-ins.';
