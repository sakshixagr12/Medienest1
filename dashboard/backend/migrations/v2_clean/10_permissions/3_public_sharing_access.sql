-- ============================================================
-- 10. PERMISSIONS: PUBLIC RX/SUMMARY SHARING ACCESS
-- Enables guest/anonymous patient access via shared URLs
-- ============================================================

-- 1. Grant SELECT permission to anon and authenticated roles
GRANT SELECT ON TABLE public.prescriptions TO anon;
GRANT SELECT ON TABLE public.patients TO anon;
GRANT SELECT ON TABLE public.clinics TO anon;
GRANT SELECT ON TABLE public.discharge_summaries TO anon;

-- 2. Define Public Select Policies
DROP POLICY IF EXISTS "Public Select Prescriptions Policy" ON public.prescriptions;
CREATE POLICY "Public Select Prescriptions Policy" ON public.prescriptions
    FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Public Select Patients Policy" ON public.patients;
CREATE POLICY "Public Select Patients Policy" ON public.patients
    FOR SELECT
    TO anon, authenticated
    USING (id IN (SELECT patient_id FROM public.prescriptions) OR id IN (SELECT patient_id FROM public.discharge_summaries));

DROP POLICY IF EXISTS "Public Select Clinics Policy" ON public.clinics;
CREATE POLICY "Public Select Clinics Policy" ON public.clinics
    FOR SELECT
    TO anon, authenticated
    USING (id IN (SELECT clinic_id FROM public.prescriptions) OR id IN (SELECT clinic_id FROM public.discharge_summaries));

DROP POLICY IF EXISTS "Public Select Discharge Summaries Policy" ON public.discharge_summaries;
CREATE POLICY "Public Select Discharge Summaries Policy" ON public.discharge_summaries
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- 3. Enable realtime for prescriptions table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'prescriptions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.prescriptions;
    END IF;
END $$;

