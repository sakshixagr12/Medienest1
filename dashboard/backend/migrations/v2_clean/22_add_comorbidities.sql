-- ==========================================
-- 22. COMORBIDITIES & HISTORY
-- ==========================================

-- 1. Update Patients (Master Record)
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS has_diabetes BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_hypertension BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_thyroid BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS past_surgeries TEXT,
ADD COLUMN IF NOT EXISTS allergies TEXT;

-- 2. Update Admission Records (Snapshot)
ALTER TABLE admission_records 
ADD COLUMN IF NOT EXISTS has_diabetes BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_hypertension BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_thyroid BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS past_surgeries TEXT,
ADD COLUMN IF NOT EXISTS allergies TEXT;

-- Reload schema
NOTIFY pgrst, 'reload schema';
