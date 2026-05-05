-- ============================================================
-- MediNest Migration: Doctor Queue Management System
-- Date: 2026-04-12
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. Create the doctor_queue table
CREATE TABLE IF NOT EXISTS public.doctor_queue (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id        UUID NOT NULL,
  doctor_id        UUID,                          -- which doctor this queue is for
  patient_id       UUID NOT NULL,
  patient_name     TEXT,                          -- denormalized for fast display
  token_number     INTEGER NOT NULL,
  status           TEXT DEFAULT 'waiting'
                     CHECK (status IN ('waiting', 'serving', 'done', 'skipped')),
  priority         TEXT DEFAULT 'normal'
                     CHECK (priority IN ('normal', 'urgent', 'elderly')),
  check_in_time    TIMESTAMPTZ DEFAULT now(),
  serving_started_at TIMESTAMPTZ,                -- when doctor called them in
  completed_at     TIMESTAMPTZ,                  -- when consultation ended
  notes            TEXT,                         -- optional front-desk note
  queue_date       DATE DEFAULT CURRENT_DATE,    -- for daily scoping
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- 2. Fast query index: today's queue for a clinic/doctor
CREATE INDEX IF NOT EXISTS idx_dq_clinic_date_status
  ON public.doctor_queue (clinic_id, queue_date, status);

CREATE INDEX IF NOT EXISTS idx_dq_doctor_date
  ON public.doctor_queue (doctor_id, queue_date);

-- 3. Enable Realtime so both doctor and receptionist get live pushes
ALTER PUBLICATION supabase_realtime ADD TABLE public.doctor_queue;
