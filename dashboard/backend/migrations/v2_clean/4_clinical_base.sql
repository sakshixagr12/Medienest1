-- ==========================================
-- 4. CLINICAL BASE: PATIENTS
-- MediNest v2.0 Modular Architecture
-- ==========================================

-- 1. Patients Table
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    contact TEXT NOT NULL, -- Standardized name for phone
    age INTEGER,
    gender TEXT CHECK (gender IN ('Male', 'Female', 'Other')),
    weight DECIMAL(5,2), -- In kg
    blood_group TEXT, -- e.g., 'A+', 'B-'
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indexes for Performance
CREATE INDEX idx_patients_clinic ON patients(clinic_id);
CREATE INDEX idx_patients_contact ON patients(contact);
CREATE INDEX idx_patients_name ON patients(name);

-- 3. UPDATED_AT Trigger
CREATE TRIGGER tr_patients_updated_at BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- 4. Row Level Security (RLS)
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- Only members of the clinic can interact with its patients
CREATE POLICY "Clinic members can manage patients" ON patients 
USING (
    EXISTS (SELECT 1 FROM clinics WHERE id = patients.clinic_id AND owner_user_id = auth.uid())
)
WITH CHECK (
    EXISTS (SELECT 1 FROM clinics WHERE id = patients.clinic_id AND owner_user_id = auth.uid())
);
