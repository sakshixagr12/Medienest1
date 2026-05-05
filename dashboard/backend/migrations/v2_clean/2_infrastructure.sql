-- ==========================================
-- 2. INFRASTRUCTURE & EXTENSIONS
-- MediNest v2.0 Modular Architecture
-- ==========================================

-- Standard Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA public;

-- For High-Performance Fuzzy Search (Medicines)
CREATE EXTENSION IF NOT EXISTS "pg_trgm" SCHEMA public;

-- Common Trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
