-- ============================================================
-- REFINED MEDICINE DATABASE — STRICT SCHEMA
-- ============================================================

-- 1. Enable pg_trgm for fuzzy/partial search performance
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Create the medicines table
-- STRICT SCHEMA: id, name, strength, category, tags
CREATE TABLE IF NOT EXISTS medicines (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT        NOT NULL,                        -- Medicine name
    strength    TEXT,                                        -- e.g. 500mg, 100ml
    category    TEXT,                                        -- e.g. analgesic, antibiotic, antihistamine
    tags        TEXT[]      DEFAULT '{}',                   -- Array of symptoms (fever, cough, pain)
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- 3. Optimized Indexes
-- Trigram index for brand name fuzzy search
CREATE INDEX IF NOT EXISTS idx_medicines_name_trgm ON medicines USING gin (name gin_trgm_ops);

-- GIN index for fast symptom/tag matching
CREATE INDEX IF NOT EXISTS idx_medicines_tags_gin ON medicines USING gin (tags);

-- 4. Sample Data (Real Common Indian Medicines)
INSERT INTO medicines (name, strength, category, tags) VALUES
('Augmentin 625 Duo', '625mg', 'Antibiotic', ARRAY['infection', 'bacterial infection', 'throat infection']),
('Azithral 500', '500mg', 'Antibiotic', ARRAY['bacterial infection', 'throat infection', 'chest infection', 'typhoid']),
('Zifi 200', '200mg', 'Antibiotic', ARRAY['typhoid', 'fever', 'urinary infection']),
('Metrogyl 400', '400mg', 'Antibiotic', ARRAY['stomach infection', 'loose motion', 'diarrhea']),
('Dolo 650', '650mg', 'Analgesic', ARRAY['fever', 'pain', 'headache', 'body ache']),
('Calpol 500', '500mg', 'Analgesic', ARRAY['fever', 'pain', 'headache']),
('Combiflam', 'Tab', 'Analgesic', ARRAY['pain', 'inflammation', 'fever', 'muscle pain']),
('Brufen 400', '400mg', 'Analgesic', ARRAY['pain', 'inflammation', 'period pain']),
('Cetirizine', '10mg', 'Antihistamine', ARRAY['allergy', 'cold', 'runny nose', 'sneezing']),
('Levorid', '5mg', 'Antihistamine', ARRAY['allergy', 'cold', 'hives']),
('Avil 25', '25mg', 'Antihistamine', ARRAY['allergy', 'itching', 'insect bite']),
('Pan 40', '40mg', 'Antacid', ARRAY['acidity', 'gastric', 'heartburn']),
('Omez 20', '20mg', 'Antacid', ARRAY['acidity', 'stomach ulcer', 'heartburn']),
('Domcet', 'Tab', 'Antiemetic', ARRAY['vomiting', 'nausea', 'motion sickness']),
('Ondansetron', '4mg', 'Antiemetic', ARRAY['vomiting', 'nausea']),
('Montek LC', 'Tab', 'Antiasthmatic', ARRAY['asthma', 'allergy', 'wheezing', 'breathing issue']),
('Asthalin Inhaler', '100mcg', 'Bronchodilator', ARRAY['asthma', 'wheezing', 'breathlessness']),
('Alex Syrup', '100ml', 'Cough Syrup', ARRAY['dry cough', 'throat irritation', 'cough']),
('Ambrolite Syrup', '100ml', 'Cough Syrup', ARRAY['productive cough', 'mucus', 'chest congestion']),
('Electral Powder', 'Sachet', 'Electrolyte', ARRAY['dehydration', 'loose motion', 'diarrhea', 'vomiting']),
('Zincovit', 'Tab', 'Supplement', ARRAY['immunity', 'weakness', 'general health']),
('Shelcal 500', '500mg', 'Supplement', ARRAY['calcium deficiency', 'bone pain', 'pregnancy supplement']),
('Telma 40', '40mg', 'Antihypertensive', ARRAY['blood pressure', 'hypertension', 'heart']),
('Ecosprin 75', '75mg', 'Antiplatelet', ARRAY['blood thinner', 'clot prevention', 'heart attack prevention']);

-- 5. Search RPC — Combined Logic (Name Detect vs Symptom Detect)
CREATE OR REPLACE FUNCTION search_medicines(search_term TEXT)
RETURNS SETOF medicines AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM medicines
    WHERE 
        name ILIKE '%' || search_term || '%' -- Brand name fuzzy match
        OR
        search_term = ANY(tags)            -- Exact symptom/tag match
    ORDER BY 
        (name ILIKE search_term || '%') DESC, -- Boost results starting with search term
        name ASC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
