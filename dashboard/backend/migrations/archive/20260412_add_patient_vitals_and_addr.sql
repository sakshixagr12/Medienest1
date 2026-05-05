-- Migration: Add address and blood_pressure to patients table
ALTER TABLE patients ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS blood_pressure TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS weight DECIMAL;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS age INTEGER;
-- Ensuring contact column exists if it was named mobile before
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='patients' AND column_name='contact') THEN
        ALTER TABLE patients RENAME COLUMN mobile TO contact;
    END IF;
EXCEPTION
    WHEN undefined_column THEN
        -- Handle cases where mobile doesn't exist either
        ALTER TABLE patients ADD COLUMN IF NOT EXISTS contact TEXT;
END $$;
