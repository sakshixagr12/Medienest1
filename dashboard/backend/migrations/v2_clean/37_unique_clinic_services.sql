-- ============================================================
-- 37. UNIQUE CLINIC SERVICES: Enforce uniqueness per clinic
-- MediNest Modular Architecture v2.0
-- ============================================================

-- 1. Remove duplicate services first (keeping the newest one based on created_at)
WITH duplicates AS (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY clinic_id, LOWER(TRIM(name)) ORDER BY created_at DESC) as rn
    FROM public.clinic_services
)
DELETE FROM public.clinic_services
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- 2. Add unique constraint on clinic_id and name to prevent future duplicates
ALTER TABLE public.clinic_services 
ADD CONSTRAINT unique_clinic_id_service_name UNIQUE (clinic_id, name);

-- 3. Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
