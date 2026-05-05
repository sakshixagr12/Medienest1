-- ============================================================
-- MediNest V2: Master Security (RLS)
-- Date: 2026-04-13
-- ============================================================

-- 1. Helper function to get current user's clinic IDs
-- (Secures both Owners and assigned Doctors)
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

-- 2. Define a macro for applying the isolation policy to a table
-- (Reduces boiler-plate and ensures consistency)
DO $$ 
DECLARE 
    t TEXT;
    target_tables TEXT[] := ARRAY['patients', 'prescriptions', 'receipts', 'doctor_queue', 'investigations', 'clinic_inventory'];
BEGIN
    FOREACH t IN ARRAY target_tables LOOP
        -- Enable RLS
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        
        -- Drop if exists
        EXECUTE format('DROP POLICY IF EXISTS "Clinic Isolation Policy" ON public.%I', t);
        
        -- Create strict isolation policy
        EXECUTE format('
            CREATE POLICY "Clinic Isolation Policy" ON public.%I
            FOR ALL
            TO authenticated
            USING (clinic_id IN (SELECT public.get_my_clinic_ids()))
            WITH CHECK (clinic_id IN (SELECT public.get_my_clinic_ids()))', t);
    END LOOP;
END $$;

-- 3. Special Policy for clinics (Owners can see their own)
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner Isolation Policy" ON public.clinics;
CREATE POLICY "Owner Isolation Policy" ON public.clinics
    FOR ALL
    TO authenticated
    USING (owner_user_id = auth.uid() OR id IN (SELECT public.clinic_doctors.clinic_id FROM public.clinic_doctors WHERE doctor_id = auth.uid()));
