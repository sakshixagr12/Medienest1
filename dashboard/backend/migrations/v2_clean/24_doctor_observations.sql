-- ==========================================
-- 24. DOCTOR OBSERVATIONS
-- ==========================================

ALTER TABLE admission_records 
ADD COLUMN IF NOT EXISTS doctor_observations TEXT;

-- Reload schema
NOTIFY pgrst, 'reload schema';
