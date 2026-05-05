-- ==========================================
-- 8. PHARMACY INVENTORY & FUZZY SEARCH
-- MediNest v2.0 Modular Architecture
-- ==========================================

-- 1. Medicines Library (Shared/Global)
CREATE TABLE IF NOT EXISTS medicines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    category TEXT, -- Tab, Syp, Inj, etc.
    strength TEXT, -- 500mg, 10ml, etc.
    tags TEXT[] DEFAULT '{}', -- symptoms/indications e.g. {'fever', 'pain'}
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. GIN Index for Fuzzy Matching
-- Requires pg_trgm extension (installed in 2_infrastructure.sql)
CREATE INDEX IF NOT EXISTS idx_medicines_name_trgm ON medicines USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_medicines_tags_trgm ON medicines USING gin (tags);

-- 3. High-Performance Search RPC
-- Used by digital-prescription/page.tsx for autocomplete
CREATE OR REPLACE FUNCTION search_medicines(search_term TEXT)
RETURNS SETOF medicines AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM medicines
    WHERE 
        name ILIKE '%' || search_term || '%'
        OR search_term = ANY(tags)
    ORDER BY 
        similarity(name, search_term) DESC,
        name ASC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql STABLE;

-- 4. RLS (Readable by all authenticated users)
ALTER TABLE medicines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can search medicines" ON medicines FOR SELECT TO authenticated USING (true);

-- 5. SEED DATA PLACEHOLDER
-- USER: YOU CAN PASTE YOUR 500+ MEDICINES HERE
-- INSERT INTO medicines (name, category, strength, tags) VALUES 
-- ('PARACETAMOL', 'Tab', '650mg', ARRAY['fever', 'headache', 'pain']),
-- ('AMOXICILLIN', 'Cap', '500mg', ARRAY['infection', 'antibiotic']);
