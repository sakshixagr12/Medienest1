-- ============================================================
-- 30. SCHEMA PATCH: Missing Tables, Columns, & RLS Updates
-- MediNest Modular Architecture v2.0
-- ============================================================

-- 1. Create clinic_services table if not exists
CREATE TABLE IF NOT EXISTS public.clinic_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    fee INTEGER NOT NULL,
    category TEXT NOT NULL,
    doctor_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on clinic_services
ALTER TABLE public.clinic_services ENABLE ROW LEVEL SECURITY;

-- Apply Clinic Isolation Policy
DROP POLICY IF EXISTS "Clinic Isolation Policy" ON public.clinic_services;
CREATE POLICY "Clinic Isolation Policy" ON public.clinic_services
    FOR ALL
    TO authenticated
    USING (clinic_id IN (SELECT public.get_my_clinic_ids()))
    WITH CHECK (clinic_id IN (SELECT public.get_my_clinic_ids()));

-- Grants on clinic_services
GRANT ALL ON TABLE public.clinic_services TO authenticated;
GRANT ALL ON TABLE public.clinic_services TO service_role;


-- 2. Create patient_histories table if not exists
CREATE TABLE IF NOT EXISTS public.patient_histories (
    patient_id UUID PRIMARY KEY REFERENCES public.patients(id) ON DELETE CASCADE,
    summary_text TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on patient_histories
ALTER TABLE public.patient_histories ENABLE ROW LEVEL SECURITY;

-- Apply Clinic Isolation Policy via parent patient's clinic
DROP POLICY IF EXISTS "Patient History Isolation Policy" ON public.patient_histories;
CREATE POLICY "Patient History Isolation Policy" ON public.patient_histories
    FOR ALL
    TO authenticated
    USING (patient_id IN (SELECT id FROM public.patients WHERE clinic_id IN (SELECT public.get_my_clinic_ids())))
    WITH CHECK (patient_id IN (SELECT id FROM public.patients WHERE clinic_id IN (SELECT public.get_my_clinic_ids())));

-- Grants on patient_histories
GRANT ALL ON TABLE public.patient_histories TO authenticated;
GRANT ALL ON TABLE public.patient_histories TO service_role;


-- 3. Add missing columns to prescriptions table
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS findings TEXT;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS date TEXT;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS weight TEXT;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS doctor_name TEXT;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS valid_till TEXT;


-- 4. Add missing columns to receipts table
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS items_json JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS patient_age TEXT;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS patient_gender TEXT;


-- 5. Add missing column to doctor_queue table
ALTER TABLE public.doctor_queue ADD COLUMN IF NOT EXISTS check_in_time TIMESTAMPTZ DEFAULT NOW();


-- 6. Update RLS policies on receipts table to use clinic isolation
DROP POLICY IF EXISTS "Clinic owners can manage receipts" ON public.receipts;
DROP POLICY IF EXISTS "Clinic Isolation Policy" ON public.receipts;
CREATE POLICY "Clinic Isolation Policy" ON public.receipts
    FOR ALL
    TO authenticated
    USING (clinic_id IN (SELECT public.get_my_clinic_ids()))
    WITH CHECK (clinic_id IN (SELECT public.get_my_clinic_ids()));


-- 7. Update RLS policies on admission_records table to use clinic isolation
DROP POLICY IF EXISTS "Clinic members can manage admission records" ON public.admission_records;
DROP POLICY IF EXISTS "Clinic Isolation Policy" ON public.admission_records;
CREATE POLICY "Clinic Isolation Policy" ON public.admission_records
    FOR ALL
    TO authenticated
    USING (clinic_id IN (SELECT public.get_my_clinic_ids()))
    WITH CHECK (clinic_id IN (SELECT public.get_my_clinic_ids()));


-- 8. Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
