-- Migration to add license expiry and profile photo to clinic_doctors
-- Created at: 2026-04-12

ALTER TABLE clinic_doctors 
ADD COLUMN IF NOT EXISTS license_expiry_date DATE,
ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;
