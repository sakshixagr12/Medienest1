-- Add clinic_type column to clinics table to support 'clinic' vs 'store'
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS clinic_type TEXT DEFAULT 'clinic' CHECK (clinic_type IN ('clinic', 'store'));
