-- ============================================================
-- 38. SUBSCRIPTIONS, PAYMENTS, AND AUDIT LOGS
-- ============================================================

-- 1. Create processed_payments Table
CREATE TABLE IF NOT EXISTS public.processed_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT UNIQUE NOT NULL,
    payment_id TEXT,
    amount INTEGER NOT NULL, -- Stored in paise/cents (e.g. 9900 = ₹99.00)
    user_id UUID NOT NULL,
    clinic_id UUID REFERENCES public.clinics(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'failed'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create subscriptions Table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID UNIQUE REFERENCES public.clinics(id) ON DELETE CASCADE,
    plan_name TEXT NOT NULL, -- 'Starter', 'Clinic', 'Professional'
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'past_due', 'expired'
    start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_date TIMESTAMPTZ NOT NULL,
    payment_id TEXT, -- References cashfree cf_payment_id
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create audit_logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID,
    clinic_id UUID REFERENCES public.clinics(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- 'LOGIN', 'CREATE_PRESCRIPTION', 'DELETE_PATIENT', 'PAYMENT_COMPLETED'
    entity_type TEXT,     -- e.g. 'prescriptions', 'patients', 'payments'
    entity_id UUID,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.processed_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies if any
DROP POLICY IF EXISTS "Owner Isolation Policy" ON public.processed_payments;
DROP POLICY IF EXISTS "Owner Isolation Policy" ON public.subscriptions;
DROP POLICY IF EXISTS "Owner Isolation Policy" ON public.audit_logs;

-- 6. Create RLS Policies
-- Clinics can see their own subscriptions
CREATE POLICY "Owner Isolation Policy" ON public.subscriptions
    FOR SELECT
    TO authenticated
    USING (clinic_id IN (SELECT id FROM public.clinics WHERE owner_user_id = auth.uid() UNION SELECT public.clinic_doctors.clinic_id FROM public.clinic_doctors WHERE doctor_id = auth.uid()));

-- Users can see their own payments
CREATE POLICY "Owner Isolation Policy" ON public.processed_payments
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR clinic_id IN (SELECT id FROM public.clinics WHERE owner_user_id = auth.uid()));

-- Users can see their own audit logs
CREATE POLICY "Owner Isolation Policy" ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (clinic_id IN (SELECT id FROM public.clinics WHERE owner_user_id = auth.uid() UNION SELECT public.clinic_doctors.clinic_id FROM public.clinic_doctors WHERE doctor_id = auth.uid()));

-- 7. Grant Permissions to authenticated and service_role
GRANT ALL ON TABLE public.processed_payments TO authenticated;
GRANT ALL ON TABLE public.processed_payments TO service_role;

GRANT ALL ON TABLE public.subscriptions TO authenticated;
GRANT ALL ON TABLE public.subscriptions TO service_role;

GRANT ALL ON TABLE public.audit_logs TO authenticated;
GRANT ALL ON TABLE public.audit_logs TO service_role;
