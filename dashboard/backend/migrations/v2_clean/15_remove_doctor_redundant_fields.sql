-- ==========================================
-- 15. REMOVE REDUNDANT DOCTOR FIELDS
-- ==========================================

-- Safely remove fields that are no longer needed in the doctors registry
ALTER TABLE IF EXISTS public.doctors 
DROP COLUMN IF EXISTS dob,
DROP COLUMN IF EXISTS email,
DROP COLUMN IF EXISTS contact_email;
