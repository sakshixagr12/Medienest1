-- 1. Patient Gender Distribution
CREATE OR REPLACE FUNCTION get_patient_gender_distribution(p_clinic_id UUID)
RETURNS TABLE (gender TEXT, count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT p.gender::TEXT, COUNT(*) AS count
    FROM patients p
    WHERE p.clinic_id = p_clinic_id AND p.gender IS NOT NULL
    GROUP BY p.gender;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Most Common Diagnoses
CREATE OR REPLACE FUNCTION get_common_diagnoses(p_clinic_id UUID, p_limit INT DEFAULT 10)
RETURNS TABLE (diagnosis TEXT, count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT pr.diagnosis::TEXT, COUNT(*) AS count
    FROM prescriptions pr
    WHERE pr.clinic_id = p_clinic_id AND pr.diagnosis IS NOT NULL AND TRIM(pr.diagnosis) != ''
    GROUP BY pr.diagnosis
    ORDER BY count DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Most Used Medicines
CREATE OR REPLACE FUNCTION get_most_used_medicines(p_clinic_id UUID, p_limit INT DEFAULT 10)
RETURNS TABLE (medicine_name TEXT, count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        TRIM(CAST(med_elem->>'name' AS TEXT)) AS medicine_name,
        COUNT(*) AS count
    FROM prescriptions pr,
         jsonb_array_elements(
             CASE 
                 WHEN jsonb_typeof(pr.medicines::jsonb) = 'array' THEN pr.medicines::jsonb 
                 WHEN jsonb_typeof(pr.medicines::jsonb) = 'string' THEN (pr.medicines#>>'{}')::jsonb
                 ELSE '[]'::jsonb
             END
         ) AS med_elem
    WHERE pr.clinic_id = p_clinic_id 
      AND pr.medicines IS NOT NULL 
      AND length(pr.medicines) > 2
    GROUP BY TRIM(CAST(med_elem->>'name' AS TEXT))
    ORDER BY count DESC
    LIMIT p_limit;
EXCEPTION WHEN OTHERS THEN
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
