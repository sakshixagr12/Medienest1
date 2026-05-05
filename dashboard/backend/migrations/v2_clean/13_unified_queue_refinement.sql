-- ==========================================
-- 13. UNIFIED QUEUE & PATIENT DATA REFINEMENT
-- MediNest v2.0 Modular Architecture
-- ==========================================

-- 1. Hardening Doctor Queue
-- Adding doctor association and precise tracking fields
ALTER TABLE doctor_queue ADD COLUMN IF NOT EXISTS doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL;
ALTER TABLE doctor_queue ADD COLUMN IF NOT EXISTS serving_started_at TIMESTAMPTZ;

-- 2. Token Integrity: Ensure unique token per clinic per day
-- This prevents collision bugs in high-traffic environments
DROP INDEX IF EXISTS idx_dq_token_unique;
CREATE UNIQUE INDEX idx_dq_token_unique ON doctor_queue (clinic_id, queue_date, token_number);

-- 3. Patient History Synchronization
-- Adding system_history for persistent AI-generated insights (Key Conditions, Maintenance Meds)
-- This allows the profile page to keep a permanent summary distinct from raw visit notes.
ALTER TABLE patients ADD COLUMN IF NOT EXISTS system_history JSONB DEFAULT '{}'::jsonb;

-- 4. Optimized Indexing for Reports
-- Used by day-summary to quickly aggregate current-day footfall
CREATE INDEX IF NOT EXISTS idx_dq_date_status ON doctor_queue (clinic_id, queue_date, status);

COMMENT ON COLUMN doctor_queue.serving_started_at IS 'Timestamp when the doctor clicked "Start Consultation"';
COMMENT ON COLUMN patients.system_history IS 'Persistent clinical summary (Conditions/Maintenance Meds) derived from history.';
