-- ==========================================
-- 23. TRIAGE & ADMISSION TYPE
-- ==========================================

-- 1. Update Admission Records
ALTER TABLE admission_records 
ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'Mild',
ADD COLUMN IF NOT EXISTS admission_type TEXT DEFAULT 'OPD';

-- 2. Performance Index for reporting
CREATE INDEX IF NOT EXISTS idx_admission_severity ON admission_records(severity);
CREATE INDEX IF NOT EXISTS idx_admission_type ON admission_records(admission_type);

-- Reload schema
NOTIFY pgrst, 'reload schema';
