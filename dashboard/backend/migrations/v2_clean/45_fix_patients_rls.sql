-- ============================================================
-- 45. FIX PATIENTS RLS POLICY
-- Updates the main patients RLS policy to allow all clinic 
-- members (doctors, staff) to read/write patients, not just the owner.
-- ============================================================

DROP POLICY IF EXISTS "Clinic members can manage patients" ON public.patients;

CREATE POLICY "Clinic members can manage patients" ON public.patients
    FOR ALL
    TO authenticated
    USING (clinic_id IN (SELECT public.get_my_clinic_ids()))
    WITH CHECK (clinic_id IN (SELECT public.get_my_clinic_ids()));

-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
