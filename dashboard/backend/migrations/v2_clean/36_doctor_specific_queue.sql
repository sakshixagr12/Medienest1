-- ============================================================
-- 36. DOCTOR-SPECIFIC QUEUE SYSTEM
-- Drops clinic-wide index uniqueness, adds doctor-scoped queue index,
-- and scopes add_patient_to_queue RPC to specific doctors.
-- ============================================================

-- 1. Drop clinic-wide uniqueness index on token_number
DROP INDEX IF EXISTS public.idx_dq_token_unique;

-- 2. Create doctor-scoped unique index
CREATE UNIQUE INDEX idx_dq_token_unique ON public.doctor_queue (
    clinic_id, 
    COALESCE(doctor_id, '00000000-0000-0000-0000-000000000000'::uuid), 
    queue_date, 
    token_number
);

-- 3. Replace token generator and queue insertion RPC
CREATE OR REPLACE FUNCTION public.add_patient_to_queue(
    p_clinic_id UUID,
    p_doctor_id UUID,
    p_patient_id UUID,
    p_patient_name TEXT,
    p_priority TEXT,
    p_notes TEXT
)
RETURNS public.doctor_queue AS $$
DECLARE
    v_next_token INTEGER;
    v_queue_date DATE := CURRENT_DATE;
    v_new_record public.doctor_queue;
BEGIN
    -- Acquire advisory lock based on clinic id, doctor id, and date hash
    -- This prevents two concurrent calls for the same clinic, doctor, and day from generating the same token.
    PERFORM pg_advisory_xact_lock(
        hashtext(p_clinic_id::text || '-' || COALESCE(p_doctor_id::text, 'null')), 
        hashtext(v_queue_date::text)
    );

    -- Ensure patient is not already in the active queue today for this doctor
    IF EXISTS (
        SELECT 1 FROM public.doctor_queue 
        WHERE clinic_id = p_clinic_id 
          AND doctor_id = p_doctor_id
          AND patient_id = p_patient_id 
          AND queue_date = v_queue_date 
          AND status NOT IN ('done', 'skipped')
    ) THEN
        RAISE EXCEPTION 'Patient is already in the queue today';
    END IF;

    -- Calculate next token number atomically within the lock, scoped by doctor
    SELECT COALESCE(MAX(token_number), 0) + 1 INTO v_next_token
    FROM public.doctor_queue
    WHERE clinic_id = p_clinic_id
      AND doctor_id = p_doctor_id
      AND queue_date = v_queue_date;

    -- Insert the new queue entry
    INSERT INTO public.doctor_queue (
        clinic_id, 
        doctor_id, 
        patient_id, 
        patient_name, 
        token_number, 
        priority, 
        queue_date, 
        notes,
        check_in_time
    ) VALUES (
        p_clinic_id, 
        p_doctor_id, 
        p_patient_id, 
        p_patient_name, 
        v_next_token, 
        p_priority, 
        v_queue_date, 
        p_notes,
        NOW()
    )
    RETURNING * INTO v_new_record;

    RETURN v_new_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
