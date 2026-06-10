-- ============================================================
-- 42. HARDEN RLS POLICIES FOR SUBSCRIPTIONS, PAYMENTS, AND AUDIT LOGS
-- Date: 2026-06-11
-- Aligns policies with get_my_clinic_ids() to correctly resolve
-- doctor assignments via their active auth.uid().
-- ============================================================

-- Drop old owner isolation policies
DROP POLICY IF EXISTS "Owner Isolation Policy" ON public.subscriptions;
DROP POLICY IF EXISTS "Owner Isolation Policy" ON public.processed_payments;
DROP POLICY IF EXISTS "Owner Isolation Policy" ON public.audit_logs;

-- Recreate subscriptions policy using public.get_my_clinic_ids()
CREATE POLICY "Owner Isolation Policy" ON public.subscriptions
    FOR SELECT
    TO authenticated
    USING (clinic_id IN (SELECT public.get_my_clinic_ids()));

-- Recreate processed_payments policy
CREATE POLICY "Owner Isolation Policy" ON public.processed_payments
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR clinic_id IN (SELECT public.get_my_clinic_ids()));

-- Recreate audit_logs policy
CREATE POLICY "Owner Isolation Policy" ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (clinic_id IN (SELECT public.get_my_clinic_ids()));

-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
