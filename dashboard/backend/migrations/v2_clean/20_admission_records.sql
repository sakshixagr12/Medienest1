-- ==========================================
-- 20. CLINICAL RECORDS: ADMISSION RECORDS
-- ==========================================

-- 1. Admission Records Table
CREATE TABLE IF NOT EXISTS admission_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    patient_name TEXT NOT NULL,
    age_sex TEXT,
    contact TEXT,
    doctor_name TEXT,
    bed_ward TEXT,
    
    date_admission TIMESTAMPTZ DEFAULT NOW(),
    
    complaints JSONB DEFAULT '[]'::jsonb, -- Chief Complaints
    hpi TEXT, -- History of Present Illness
    findings JSONB DEFAULT '[]'::jsonb, -- Clinical Findings
    diagnosis TEXT,
    investigations JSONB DEFAULT '[]'::jsonb, -- Lab/Radiology
    treatment_plan JSONB DEFAULT '[]'::jsonb, -- Initial Treatment Plan
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Performance Indexes
CREATE INDEX idx_admission_records_patient ON admission_records(patient_id);
CREATE INDEX idx_admission_records_clinic ON admission_records(clinic_id);
CREATE INDEX idx_admission_records_date ON admission_records(date_admission);

-- 3. Row Level Security (RLS)
ALTER TABLE admission_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinic members can manage admission records" ON admission_records
USING (EXISTS (SELECT 1 FROM clinics WHERE id = admission_records.clinic_id AND owner_user_id = auth.uid()));

-- Force Schema Cache Reload
NOTIFY pgrst, 'reload schema';
