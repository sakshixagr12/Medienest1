-- ==========================================
-- 16. ADD DOCTOR EXPERIENCE YEARS
-- ==========================================

-- Add experience_years column to the doctors registry if it doesn't exist
ALTER TABLE IF EXISTS public.doctors 
ADD COLUMN IF NOT EXISTS experience_years INTEGER DEFAULT 0;
