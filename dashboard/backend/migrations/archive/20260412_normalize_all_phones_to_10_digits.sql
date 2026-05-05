-- Migration: Normalize all patient contact numbers to exactly 10 digits
-- This ensures that "PINTU" and other patients are easily searchable.

UPDATE patients 
SET contact = RIGHT(REGEXP_REPLACE(contact, '\D', '', 'g'), 10)
WHERE contact IS NOT NULL;

-- Remove any records that don't have a valid 10-digit number if necessary,
-- but for now just normalization is safer.
