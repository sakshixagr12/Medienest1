-- Migration to add detailed professional and personal fields to clinic_doctors table
-- Created at: 2026-04-12

ALTER TABLE clinic_doctors 
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS dob DATE,
ADD COLUMN IF NOT EXISTS registration_number TEXT,
ADD COLUMN IF NOT EXISTS experience_years INTEGER,
ADD COLUMN IF NOT EXISTS timings TEXT,
ADD COLUMN IF NOT EXISTS fees INTEGER;
