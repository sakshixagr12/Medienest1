-- ==========================================
-- 29. REBUILD ADMISSION RECORDS (Full Schema)
-- ==========================================
-- Drops and recreates admission_records with all columns
-- required by the current frontend (as of v2 wizard redesign).

DROP TABLE IF EXISTS admission_records CASCADE;

CREATE TABLE admission_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relations
    clinic_id  UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,

    -- Patient demographics (snapshot at admission time)
    patient_name TEXT NOT NULL,
    age_sex      TEXT,
    contact      TEXT,

    -- Admission context
    doctor_name    TEXT,
    ward           TEXT,
    bed            TEXT,
    department     TEXT,
    date_admission TIMESTAMPTZ DEFAULT NOW(),
    severity       TEXT DEFAULT 'Mild',       -- Mild | Moderate | Severe
    admission_type TEXT DEFAULT 'OPD',        -- OPD  | Emergency | Referral

    -- Comorbidities / Medical history
    has_diabetes    BOOLEAN DEFAULT FALSE,
    has_hypertension BOOLEAN DEFAULT FALSE,
    has_thyroid     BOOLEAN DEFAULT FALSE,
    allergies       TEXT,
    past_surgeries  TEXT,

    -- Vitals (structured)
    vitals        TEXT,         -- Legacy text fallback
    vitals_bp_sys INTEGER,
    vitals_bp_dia INTEGER,
    vitals_pulse  INTEGER,
    vitals_temp   NUMERIC(4,1),
    vitals_spo2   INTEGER,

    -- Clinical documentation
    hpi            TEXT,
    complaints     JSONB DEFAULT '[]'::jsonb,
    findings       JSONB DEFAULT '[]'::jsonb,
    diagnosis      TEXT,
    final_diagnosis TEXT,
    investigations JSONB DEFAULT '[]'::jsonb,
    treatment_plan JSONB DEFAULT '[]'::jsonb,

    -- Management
    doctor_observations TEXT,

    -- Attachments (array of {name, url, type, size})
    attachments JSONB DEFAULT '[]'::jsonb,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ar_clinic   ON admission_records(clinic_id);
CREATE INDEX idx_ar_patient  ON admission_records(patient_id);
CREATE INDEX idx_ar_date     ON admission_records(date_admission DESC);
CREATE INDEX idx_ar_doctor   ON admission_records(doctor_name);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_admission_records_updated_at ON admission_records;
CREATE TRIGGER set_admission_records_updated_at
  BEFORE UPDATE ON admission_records
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Row Level Security
ALTER TABLE admission_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinic members can manage admission records"
  ON admission_records
  USING (
    EXISTS (
      SELECT 1 FROM clinics
      WHERE id = admission_records.clinic_id
        AND owner_user_id = auth.uid()
    )
  );

-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
