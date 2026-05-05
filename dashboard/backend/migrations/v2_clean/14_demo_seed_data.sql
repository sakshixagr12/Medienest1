-- ============================================================
-- MediNest V2: Demo Seed Data
-- Date: 2026-04-13
-- ============================================================

-- 1. Insert Global Medicines
INSERT INTO public.medicines (name, category, default_dosage) VALUES
('Paracetamol 500mg', 'Analgesic', '1-0-1 after food'),
('Amoxicillin 500mg', 'Antibiotic', '1-1-1 for 5 days'),
('Cetirizine 10mg', 'Antihistamine', '0-0-1 at bedtime'),
('Pantoprazole 40mg', 'Antacid', '1-0-0 before breakfast')
ON CONFLICT (name) DO NOTHING;

-- 2. Note for User
-- To populate clinical data (Patients, Doctors, Queue), please use the
-- "Register New Clinic" or "Demo Seed" button in the Admin dashboard,
-- as those require valid auth.uid() values to pass the RLS policies.
