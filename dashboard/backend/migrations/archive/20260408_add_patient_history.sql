-- file: backend/migrations/20260408_add_patient_history.sql
-- -------------------------------------------------------
-- Patients (basic info – safe to create if not exists)
CREATE TABLE IF NOT EXISTS patients (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    mobile      TEXT NOT NULL,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- One‑row AI‑generated snapshot per patient
CREATE TABLE IF NOT EXISTS patient_histories (
    patient_id   UUID PRIMARY KEY REFERENCES patients(id) ON DELETE CASCADE,
    summary_text TEXT NOT NULL,               -- 🧾 snapshot string
    updated_at   TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Visits / prescriptions (one row per doctor visit)
CREATE TABLE IF NOT EXISTS patient_visits (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id   UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id    UUID NOT NULL,                -- Supabase auth UID of the doctor
    visit_date   DATE NOT NULL,
    notes        TEXT,
    prescription JSONB,
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT now()
);
