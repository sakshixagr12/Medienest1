-- ==========================================
-- 28. ADD FINAL DIAGNOSIS TO ADMISSION RECORDS
-- ==========================================

ALTER TABLE admission_records ADD COLUMN IF NOT EXISTS final_diagnosis TEXT;

-- Force Schema Cache Reload
NOTIFY pgrst, 'reload schema';
