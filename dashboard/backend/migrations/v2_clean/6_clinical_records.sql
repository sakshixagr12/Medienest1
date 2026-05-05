-- ==========================================
-- 6. CLINICAL RECORDS: RX & DISCHARGE
-- MediNest v2.0 Modular Architecture
-- ==========================================

-- 1. Digital Prescriptions Table
CREATE TABLE IF NOT EXISTS prescriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES doctors(id), -- Nullable if manual entry
    doctor_name TEXT, -- Cached for print fidelity
    
    complaints TEXT, -- Chief Complaints (C/C)
    findings TEXT, -- Clinical Findings (O/E)
    diagnosis TEXT, 
    medicines JSONB DEFAULT '[]'::jsonb,
    advice TEXT,
    
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    weight DECIMAL(5,2), -- Snapshot at time of Rx
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Discharge Summaries Table (IPD Context)
CREATE TABLE IF NOT EXISTS discharge_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
CREATE INDEX idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX idx_prescriptions_clinic ON prescriptions(clinic_id);
CREATE INDEX idx_prescriptions_date ON prescriptions(date);
CREATE INDEX idx_discharge_clinic ON discharge_summaries(clinic_id);

-- 4. Row Level Security (RLS)
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE discharge_summaries ENABLE ROW LEVEL SECURITY;

-- Shared Clinical Access Policy
CREATE POLICY "Clinic members can manage prescriptions" ON prescriptions
USING (EXISTS (SELECT 1 FROM clinics WHERE id = prescriptions.clinic_id AND owner_user_id = auth.uid()));

CREATE POLICY "Clinic members can manage discharge summaries" ON discharge_summaries
USING (EXISTS (SELECT 1 FROM clinics WHERE id = discharge_summaries.clinic_id AND owner_user_id = auth.uid()));
