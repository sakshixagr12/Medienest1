-- ==========================================
-- 17. REMOVE DOCTOR CONSULTATION FEES
-- ==========================================

-- Remove fees column from clinic_doctors table
ALTER TABLE IF EXISTS public.clinic_doctors 
DROP COLUMN IF EXISTS fees;
