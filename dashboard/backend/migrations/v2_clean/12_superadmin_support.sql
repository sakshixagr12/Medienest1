-- ==========================================
-- 12. SUPERADMIN & APPROVAL SUPPORT
-- MediNest v2.0 Modular Architecture
-- ==========================================

-- 1. Add approved_at column to clinics
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- 2. Align status default to 'pending' to support approval workflow
ALTER TABLE clinics ALTER COLUMN status SET DEFAULT 'pending';

-- 3. Update existing records if any were set to 'active' prematurely
-- (Only if it makes sense in the current development context)
-- UPDATE clinics SET status = 'pending' WHERE status = 'active' AND approved_at IS NULL;

COMMENT ON COLUMN clinics.approved_at IS 'Timestamp when the superadmin approved this clinic to go live.';
