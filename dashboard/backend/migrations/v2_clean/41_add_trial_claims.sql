-- Create trial_claims Table
CREATE TABLE IF NOT EXISTS public.trial_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    claimed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.trial_claims ENABLE ROW LEVEL SECURITY;

-- Owner policy
CREATE POLICY "Owner Isolation Policy" ON public.trial_claims
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Permissions
GRANT ALL ON TABLE public.trial_claims TO authenticated;
GRANT ALL ON TABLE public.trial_claims TO service_role;
