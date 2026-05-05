-- ==========================================
-- 21. REFINE ADMISSION RECORDS SCHEMA
-- ==========================================

ALTER TABLE admission_records 
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS ward TEXT,
ADD COLUMN IF NOT EXISTS bed TEXT;

-- Move data from bed_ward if it exists (legacy support)
UPDATE admission_records SET ward = bed_ward WHERE ward IS NULL AND bed_ward IS NOT NULL;

-- Reload schema
NOTIFY pgrst, 'reload schema';
