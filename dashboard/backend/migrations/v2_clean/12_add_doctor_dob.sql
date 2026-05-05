-- ============================================================
-- Add dob column to doctors table
-- Date: 2026-04-13
-- ============================================================

ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS dob DATE;
