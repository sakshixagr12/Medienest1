-- ============================================================
-- MediNest V2: Maintenance & Auto-Purge
-- Date: 2026-04-13
-- ============================================================

-- 1. Function to clean up stale 'waiting' patients from previous days
-- (In case front-desk forgets to clear the queue)
CREATE OR REPLACE FUNCTION public.purge_stale_queues()
RETURNS void AS $$
BEGIN
    UPDATE public.doctor_queue
    SET status = 'skipped'
    WHERE status = 'waiting' 
    AND queue_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: This can be scheduled via pg_cron in Supabase if enabled
-- or triggered via a simple daily maintenance API call.
