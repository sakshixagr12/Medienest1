-- Migration 43: Add missing AI columns to prescriptions table
-- These columns are used by the AI summary and guidance sheet endpoints
-- but were never added via a prior migration.

ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS ai_summary jsonb;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS guidance_sheet jsonb;
