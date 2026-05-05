-- ============================================================
-- MediNest Migration: Enable Realtime for doctor_queue
-- Date: 2026-04-13
-- Run this in the Supabase SQL Editor if live updates aren't working
-- ============================================================

-- 1. Ensure the table is in the realtime publication
--    (safe to run multiple times — IF NOT EXISTS handles duplicates)
DO $$
BEGIN
  -- Add to realtime publication (ignore error if already added)
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.doctor_queue;
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'doctor_queue already in supabase_realtime publication.';
  END;
END
$$;

-- 2. Enable Row Level Security (RLS) on doctor_queue if not enabled
ALTER TABLE public.doctor_queue ENABLE ROW LEVEL SECURITY;

-- 3. Ensure anon role can SELECT (read) - needed for realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'doctor_queue' AND policyname = 'allow_select_doctor_queue'
  ) THEN
    CREATE POLICY allow_select_doctor_queue
      ON public.doctor_queue FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END
$$;

-- 4. Ensure authenticated role can INSERT/UPDATE/DELETE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'doctor_queue' AND policyname = 'allow_all_authenticated_doctor_queue'
  ) THEN
    CREATE POLICY allow_all_authenticated_doctor_queue
      ON public.doctor_queue FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;
