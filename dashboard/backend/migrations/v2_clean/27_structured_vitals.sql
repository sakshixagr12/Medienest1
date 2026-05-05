-- ==========================================
-- 27. STRUCTURED VITALS
-- ==========================================

ALTER TABLE admission_records 
ADD COLUMN IF NOT EXISTS vitals_bp_sys INTEGER,
ADD COLUMN IF NOT EXISTS vitals_bp_dia INTEGER,
ADD COLUMN IF NOT EXISTS vitals_pulse INTEGER,
ADD COLUMN IF NOT EXISTS vitals_temp NUMERIC,
ADD COLUMN IF NOT EXISTS vitals_spo2 INTEGER;

-- Reload schema
NOTIFY pgrst, 'reload schema';
