-- Migration: Add blood_group column to patients table
ALTER TABLE patients ADD COLUMN IF NOT EXISTS blood_group TEXT;
