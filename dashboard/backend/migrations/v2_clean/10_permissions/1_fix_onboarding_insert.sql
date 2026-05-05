-- ==========================================
-- 10. FIX: ONBOARDING PERMISSIONS
-- Specifically allows users to insert their first clinic
-- ==========================================

-- 1. Add missing INSERT policy for clinics
-- This allows any authenticated user to create a clinic where they are the owner
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'clinics' AND policyname = 'Users can insert their own clinic'
    ) THEN
        CREATE POLICY "Users can insert their own clinic" 
        ON clinics FOR INSERT 
        TO authenticated 
        WITH CHECK (auth.uid() = owner_user_id);
    END IF;
END $$;

-- 2. Ensure basic table grants are present
GRANT ALL ON TABLE clinics TO authenticated;
GRANT ALL ON TABLE clinics TO service_role;

GRANT ALL ON TABLE doctors TO authenticated;
GRANT ALL ON TABLE doctors TO service_role;

GRANT ALL ON TABLE clinic_doctors TO authenticated;
GRANT ALL ON TABLE clinic_doctors TO service_role;

-- 3. Verify RLS for clinic_doctors
-- Ensuring the owner can link their doctors during onboarding
DROP POLICY IF EXISTS "Clinic owners can manage members" ON clinic_doctors;
CREATE POLICY "Clinic owners can manage members" 
ON clinic_doctors FOR ALL 
TO authenticated 
USING (
    EXISTS (SELECT 1 FROM clinics WHERE id = clinic_doctors.clinic_id AND owner_user_id = auth.uid())
);

COMMENT ON POLICY "Users can insert their own clinic" ON clinics IS 'Enables the onboarding flow for new users.';
