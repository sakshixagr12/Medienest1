-- Migration: Add diagnosis column to prescriptions table
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS diagnosis TEXT;
