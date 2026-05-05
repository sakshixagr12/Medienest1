-- ==========================================
-- 5. OPERATIONAL QUEUE
-- MediNest v2.0 Modular Architecture
-- ==========================================

-- 1. Queue Table for Live Traffic
CREATE TABLE IF NOT EXISTS doctor_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    patient_name TEXT NOT NULL, -- Cached for performance
    token_number INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'waiting' 
        CHECK (status IN ('waiting', 'serving', 'done', 'skipped')),
    priority TEXT NOT NULL DEFAULT 'normal' 
        CHECK (priority IN ('normal', 'urgent', 'elderly')),
    queue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Performance & Retrieval Indexes
CREATE INDEX idx_queue_clinic_date ON doctor_queue(clinic_id, queue_date);
CREATE INDEX idx_queue_status ON doctor_queue(status);
CREATE INDEX idx_queue_tokens ON doctor_queue(queue_date, token_number);

-- 3. Row Level Security (RLS)
ALTER TABLE doctor_queue ENABLE ROW LEVEL SECURITY;

-- Queue is scoped to clinic ownership/membership
CREATE POLICY "Clinic members can manage queue" ON doctor_queue
USING (
    EXISTS (SELECT 1 FROM clinics WHERE id = doctor_queue.clinic_id AND owner_user_id = auth.uid())
)
WITH CHECK (
    EXISTS (SELECT 1 FROM clinics WHERE id = doctor_queue.clinic_id AND owner_user_id = auth.uid())
);

-- 4. Enable Supabase Realtime
-- This is usually done via:
-- alter publication supabase_realtime add table doctor_queue;
-- Note: In modular SQL, we usually use a separate comment or just ensure the user knows.
COMMENT ON TABLE doctor_queue IS 'MediNest Live Queue System - Enabled for Realtime';
