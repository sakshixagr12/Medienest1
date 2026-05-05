-- ==========================================
-- 19. UPDATE MEDICINES SCHEMA FOR 40K+ DATA
-- ==========================================

-- 1. Alter table to include new columns if they don't exist
ALTER TABLE public.medicines 
ADD COLUMN IF NOT EXISTS manufacturer TEXT,
ADD COLUMN IF NOT EXISTS pack_size TEXT,
ADD COLUMN IF NOT EXISTS price TEXT,
ADD COLUMN IF NOT EXISTS compositions TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS discontinued BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS primary_drug TEXT,
ADD COLUMN IF NOT EXISTS dosage_form TEXT;

-- 2. Ensure indexes for performance on 40k+ records
CREATE INDEX IF NOT EXISTS idx_medicines_primary_drug ON public.medicines(primary_drug);
CREATE INDEX IF NOT EXISTS idx_medicines_compositions_gin ON public.medicines USING gin (compositions);
CREATE INDEX IF NOT EXISTS idx_medicines_name_trgm ON public.medicines USING gin (name gin_trgm_ops);

-- 3. Update existing data (optional, but good for consistency)
-- If category was 'Analgesic', maybe we want to keep it or update it.
-- The user specified 'category': 'allopathy' in their example.

-- 4. Secure Search RPC (Optimized for the new columns)
CREATE OR REPLACE FUNCTION public.search_medicines_v2(search_term TEXT)
RETURNS SETOF public.medicines AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM public.medicines
    WHERE 
        name ILIKE '%' || search_term || '%'
        OR primary_drug ILIKE '%' || search_term || '%'
        OR compositions::text ILIKE '%' || search_term || '%'
    ORDER BY 
        (primary_drug ILIKE search_term || '%') DESC,
        (name ILIKE search_term || '%') DESC
    LIMIT 15;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
