-- ==========================================
-- 6. CLINICAL RECORDS: DISCHARGE SUMMARIES
-- MediNest v2.0 Modular Architecture
-- ==========================================

-- 2. Discharge Summaries Table (IPD Context)
CREATE TABLE IF NOT EXISTS discharge_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    patient_name TEXT NOT NULL,
    reg_no TEXT, -- IPD Registration Number
    age_sex TEXT, -- Cached "25Y / M"
    doctor_name TEXT,
    
    date_admission TIMESTAMPTZ,
    date_discharge TIMESTAMPTZ,
    
    diagnosis TEXT,
    complaints TEXT,
    findings TEXT,
    treatment TEXT, -- Course in Hospital
    medicines JSONB DEFAULT '[]'::jsonb, -- Discharge Medications
    advice TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_discharge_clinic ON discharge_summaries(clinic_id);

-- 4. Row Level Security (RLS)
ALTER TABLE discharge_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinic members can manage discharge summaries" ON discharge_summaries
USING (EXISTS (SELECT 1 FROM clinics WHERE id = discharge_summaries.clinic_id AND owner_user_id = auth.uid()));
