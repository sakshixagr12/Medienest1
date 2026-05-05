-- ==========================================
-- 25. ATTACHMENTS & STORAGE SETUP
-- ==========================================

-- 1. Add attachments column to admission_records
ALTER TABLE admission_records 
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- 2. Initialize Storage Bucket for Medical Records
-- Note: This requires the storage schema to be active
INSERT INTO storage.buckets (id, name, public)
SELECT 'medical-records', 'medical-records', true
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'medical-records'
);

-- 3. Storage Policies
-- Allow clinic members to upload to their bucket path-wise (simulated via metadata in future)
-- For now, allow authenticated users to manage files in the bucket
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'medical-records');

CREATE POLICY "Allow authenticated reads" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'medical-records');

CREATE POLICY "Allow authenticated deletes" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'medical-records');

-- Reload schema
NOTIFY pgrst, 'reload schema';
