-- ==========================================
-- 18. ADD CLINIC DOCTOR TIMINGS
-- ==========================================

-- Add timings column to the clinic_doctors junction table if it doesn't exist
ALTER TABLE IF EXISTS public.clinic_doctors 
ADD COLUMN IF NOT EXISTS timings TEXT;
