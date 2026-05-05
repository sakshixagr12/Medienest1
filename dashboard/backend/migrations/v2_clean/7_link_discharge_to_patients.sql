-- ==========================================
-- 7. LINK DISCHARGE SUMMARIES TO PATIENTS
-- MediNest v2.0
-- ==========================================

-- 1. Add patient_id column to discharge_summaries
ALTER TABLE public.discharge_summaries 
ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL;

-- 2. Create index for performance
CREATE INDEX IF NOT EXISTS idx_discharge_patient ON public.discharge_summaries(patient_id);

-- 3. Update RLS policies to be more explicit
DROP POLICY IF EXISTS "Clinic members can manage discharge summaries" ON public.discharge_summaries;

CREATE POLICY "Clinic members can manage discharge summaries" ON public.discharge_summaries
FOR ALL
TO authenticated
USING (clinic_id IN (SELECT public.get_my_clinic_ids()))
WITH CHECK (clinic_id IN (SELECT public.get_my_clinic_ids()));

-- 4. Comments for clarity
COMMENT ON COLUMN public.discharge_summaries.patient_id IS 'Relational link to the patients table for clinical history aggregation.';
