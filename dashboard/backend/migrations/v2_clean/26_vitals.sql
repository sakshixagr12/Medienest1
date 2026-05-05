-- ==========================================
-- 26. VITALS SECTION
-- ==========================================

ALTER TABLE admission_records 
ADD COLUMN IF NOT EXISTS vitals TEXT;

-- Reload schema
NOTIFY pgrst, 'reload schema';
