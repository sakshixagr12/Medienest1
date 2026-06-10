-- ============================================================
-- 40. FIX: DOCTOR RLS PROFILE MAPPING
-- Date: 2026-06-10
-- Corrects `get_my_clinic_ids()` to resolve `auth.uid()` against
-- `doctors.user_id` rather than directly to `clinic_doctors.doctor_id`
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_my_clinic_ids()
RETURNS TABLE (clinic_id UUID) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT id FROM public.clinics WHERE owner_user_id = auth.uid()
    UNION
    SELECT public.clinic_doctors.clinic_id FROM public.clinic_doctors 
    WHERE doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid());
END;
$$;

-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
