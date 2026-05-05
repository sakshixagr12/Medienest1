-- Migration: Normalize existing names to UPPERCASE
-- This resolves existing case-sensitivity duplicates in the database.

-- Normalize Patients
UPDATE patients SET name = UPPER(TRIM(name));

-- Normalize Medicines (if table exists)
DO $$ 
BEGIN 
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'medicines') THEN
        UPDATE medicines SET name = UPPER(TRIM(name));
    END IF;
END $$;
