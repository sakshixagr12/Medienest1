-- ==========================================
-- 1. TOTAL SYSTEM RESET
-- MediNest v2.0 Modular Architecture
-- WARNING: This will drop EVERYTHING in the public schema.
-- ==========================================

-- Reset public schema and recreate permissions
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- Standard Supabase permissions
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO authenticated;
GRANT ALL ON SCHEMA public TO service_role;

-- Notify completion
COMMENT ON SCHEMA public IS 'MediNest v2.0 - Total Reset Successful';
