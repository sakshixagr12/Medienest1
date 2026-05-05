-- ============================================================
-- MediNest V2: MASTER INITIALIZATION SCRIPT
-- Consolidated: 2026-04-13
-- CAUTION: RUNNING THIS WILL DELETE ALL DATA IN THE PUBLIC SCHEMA.
-- ============================================================

-- ── 1. HARD RESET ───────────────────────────────────────────
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO authenticated;
GRANT ALL ON SCHEMA public TO service_role;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "pg_trgm" SCHEMA public;

SET search_path TO public;

-- ── 2. IDENTITY & ROLE DEFINTIONS ────────────────────────────
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('owner', 'doctor', 'staff', 'admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.clinic_status AS ENUM ('pending', 'active', 'suspended');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ── 3. CLINIC & PROVIDER SETUP ──────────────────────────────
CREATE TABLE public.clinics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID NOT NULL, 
    name TEXT NOT NULL,
    name_hindi TEXT,
    tagline TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    status clinic_status DEFAULT 'active',
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE, 
    name TEXT NOT NULL,
    specialty TEXT,
    qualification TEXT,
    experience_years INTEGER,
    registration_number TEXT,
    license_expiry_date DATE,
    profile_photo_url TEXT,
    bio TEXT,
    contact_email TEXT,
    contact TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.clinic_doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    timings TEXT,
    fees DECIMAL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(clinic_id, doctor_id)
);

CREATE TRIGGER tr_clinics_updated BEFORE UPDATE ON public.clinics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER tr_doctors_updated BEFORE UPDATE ON public.doctors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── 4. PATIENT REGISTRY ──────────────────────────────────────
CREATE TABLE public.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    contact TEXT NOT NULL, 
    age INTEGER,
    gender TEXT,
    blood_group TEXT,
    address TEXT,
    weight DECIMAL,
    medical_history JSONB DEFAULT '[]',
    allergies JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_patients_clinic ON public.patients(clinic_id);
CREATE INDEX idx_patients_contact ON public.patients(contact);
CREATE UNIQUE INDEX idx_patients_uniqueness ON public.patients (clinic_id, name, contact);
CREATE TRIGGER tr_patients_updated BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── 5. PHARMACY & INVENTORY ──────────────────────────────────
-- Advanced Medicines Table with Trigram Search & Symptoms Tags
CREATE TABLE public.medicines (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT        NOT NULL,                        
    strength    TEXT,                                        
    category    TEXT,                                        
    tags        TEXT[]      DEFAULT '{}',                   
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- Optimized Indexes for fuzzy search and tag matching
CREATE INDEX IF NOT EXISTS idx_medicines_name_trgm ON public.medicines USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_medicines_tags_gin ON public.medicines USING gin (tags);

CREATE TABLE public.clinic_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    medicine_name TEXT NOT NULL,
    stock_quantity INTEGER DEFAULT 0,
    price DECIMAL DEFAULT 0,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(clinic_id, medicine_name)
);

CREATE TRIGGER tr_inventory_updated BEFORE UPDATE ON public.clinic_inventory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── 6. DAILY QUEUE SYSTEM ────────────────────────────────────
CREATE TABLE public.doctor_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES public.doctors(id) ON DELETE SET NULL,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    patient_name TEXT, 
    token_number INTEGER NOT NULL,
    status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'serving', 'done', 'skipped')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent', 'elderly')),
    queue_date DATE DEFAULT CURRENT_DATE,
    serving_started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_dq_active ON public.doctor_queue (clinic_id, queue_date, status);
CREATE UNIQUE INDEX idx_dq_token_unique ON public.doctor_queue (clinic_id, queue_date, token_number);
ALTER PUBLICATION supabase_realtime ADD TABLE public.doctor_queue;

-- ── 7. CLINICAL DOCUMENTATION ───────────────────────────────
CREATE TABLE public.prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES public.doctors(id) ON DELETE SET NULL,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    complaints TEXT,
    diagnosis TEXT,
    medicines JSONB DEFAULT '[]', 
    advice TEXT,
    follow_up_date DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.investigations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id UUID REFERENCES public.prescriptions(id) ON DELETE CASCADE,
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    test_name TEXT NOT NULL,
    results TEXT,
    lab_name TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER tr_prescriptions_updated BEFORE UPDATE ON public.prescriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── 8. BILLING & RECEIPTS ──────────────────────────────────
CREATE TABLE public.receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    prescription_id UUID REFERENCES public.prescriptions(id) ON DELETE SET NULL,
    patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
    patient_name TEXT,
    patient_phone TEXT,
    receipt_number TEXT NOT NULL UNIQUE,
    doctor_name TEXT,
    items JSONB DEFAULT '[]', 
    total_amount DECIMAL NOT NULL DEFAULT 0,
    payment_mode TEXT DEFAULT 'Cash' CHECK (payment_mode IN ('Cash', 'Online', 'Card', 'Other')),
    printed_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_receipts_reporting ON public.receipts (clinic_id, printed_at);

-- ── 9. MAINTENANCE LOGIC ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.purge_stale_queues()
RETURNS void AS $$
BEGIN
    UPDATE public.doctor_queue
    SET status = 'skipped'
    WHERE status = 'waiting' 
    AND queue_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 10. MASTER SECURITY (RLS) ────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_clinic_ids()
RETURNS TABLE (clinic_id UUID) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT id FROM public.clinics WHERE owner_user_id = auth.uid()
    UNION
    SELECT public.clinic_doctors.clinic_id FROM public.clinic_doctors WHERE doctor_id = auth.uid();
END;
$$;

DO $$ 
DECLARE 
    t TEXT;
    target_tables TEXT[] := ARRAY['patients', 'prescriptions', 'receipts', 'doctor_queue', 'investigations', 'clinic_inventory'];
BEGIN
    FOREACH t IN ARRAY target_tables LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS "Clinic Isolation Policy" ON public.%I', t);
        EXECUTE format('
            CREATE POLICY "Clinic Isolation Policy" ON public.%I
            FOR ALL
            TO authenticated
            USING (clinic_id IN (SELECT public.get_my_clinic_ids()))
            WITH CHECK (clinic_id IN (SELECT public.get_my_clinic_ids()))', t);
    END LOOP;
END $$;

ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner Isolation Policy" ON public.clinics;
CREATE POLICY "Owner Isolation Policy" ON public.clinics
    FOR ALL
    TO authenticated
    USING (owner_user_id = auth.uid() OR id IN (SELECT public.clinic_doctors.clinic_id FROM public.clinic_doctors WHERE doctor_id = auth.uid()));

-- ── 11. BULK MEDICINE SEED DATA ──────────────────────────────
INSERT INTO public.medicines (name, strength, category, tags) VALUES
('Augmentin 625 Duo', '625mg', 'Antibiotic', ARRAY['infection', 'bacterial infection', 'throat infection']),
('Azithral 500', '500mg', 'Antibiotic', ARRAY['bacterial infection', 'throat infection', 'chest infection', 'typhoid']),
('Zifi 200', '200mg', 'Antibiotic', ARRAY['typhoid', 'fever', 'urinary infection']),
('Metrogyl 400', '400mg', 'Antibiotic', ARRAY['stomach infection', 'loose motion', 'diarrhea']),
('Dolo 650', '650mg', 'Analgesic', ARRAY['fever', 'pain', 'headache', 'body ache']),
('Calpol 500', '500mg', 'Analgesic', ARRAY['fever', 'pain', 'headache']),
('Combiflam', 'Tab', 'Analgesic', ARRAY['pain', 'inflammation', 'fever', 'muscle pain']),
('Brufen 400', '400mg', 'Analgesic', ARRAY['pain', 'inflammation', 'period pain']),
('Cetirizine', '10mg', 'Antihistamine', ARRAY['allergy', 'cold', 'runny nose', 'sneezing']),
('Levorid', '5mg', 'Antihistamine', ARRAY['allergy', 'cold', 'hives']),
('Avil 25', '25mg', 'Antihistamine', ARRAY['allergy', 'itching', 'insect bite']),
('Pan 40', '40mg', 'Antacid', ARRAY['acidity', 'gastric', 'heartburn']),
('Omez 20', '20mg', 'Antacid', ARRAY['acidity', 'stomach ulcer', 'heartburn']),
('Domcet', 'Tab', 'Antiemetic', ARRAY['vomiting', 'nausea', 'motion sickness']),
('Ondansetron', '4mg', 'Antiemetic', ARRAY['vomiting', 'nausea']),
('Montek LC', 'Tab', 'Antiasthmatic', ARRAY['asthma', 'allergy', 'wheezing', 'breathing issue']),
('Asthalin Inhaler', '100mcg', 'Bronchodilator', ARRAY['asthma', 'wheezing', 'breathlessness']),
('Alex Syrup', '100ml', 'Cough Syrup', ARRAY['dry cough', 'throat irritation', 'cough']),
('Ambrolite Syrup', '100ml', 'Cough Syrup', ARRAY['productive cough', 'mucus', 'chest congestion']),
('Electral Powder', 'Sachet', 'Electrolyte', ARRAY['dehydration', 'loose motion', 'diarrhea', 'vomiting']),
('Zincovit', 'Tab', 'Supplement', ARRAY['immunity', 'weakness', 'general health']),
('Shelcal 500', '500mg', 'Supplement', ARRAY['calcium deficiency', 'bone pain', 'pregnancy supplement']),
('Telma 40', '40mg', 'Antihypertensive', ARRAY['blood pressure', 'hypertension', 'heart']),
('Ecosprin 75', '75mg', 'Antiplatelet', ARRAY['blood thinner', 'clot prevention', 'heart attack prevention']);

-- ── 12. ADVANCED MEDICINE SEARCH RPC ────────────────────────
CREATE OR REPLACE FUNCTION public.search_medicines(search_term TEXT)
RETURNS SETOF public.medicines AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM public.medicines
    WHERE 
        name ILIKE '%' || search_term || '%' -- Brand name fuzzy match
        OR
        search_term = ANY(tags)            -- Exact symptom/tag match
    ORDER BY 
        (name ILIKE search_term || '%') DESC, -- Boost results starting with search term
        name ASC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
