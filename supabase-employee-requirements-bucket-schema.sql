-- ============================================================================
-- SUPABASE STORAGE BUCKET SCHEMA: employee-requirements
-- Simpal Group of Companies • HRHub Enterprise
-- ============================================================================
-- Purpose:
-- Stores all employee 201 compliance files (NBI, Contract, Government IDs, Medical)
-- directly in a cloud storage bucket so PostgreSQL database records remain lightweight.
-- ============================================================================

-- 1. Create the dedicated storage bucket for employee 201 documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'employee-requirements',
  'employee-requirements',
  true,
  20971520, -- 20 MB max file size per requirement document
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
)
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 20971520;

-- 2. Storage Policies for Read Access
DROP POLICY IF EXISTS "Allow public read of employee requirements" ON storage.objects;
CREATE POLICY "Allow public read of employee requirements"
ON storage.objects FOR SELECT
USING (bucket_id = 'employee-requirements');

-- 3. Storage Policies for Upload (Insert) Access
DROP POLICY IF EXISTS "Allow upload of employee requirements" ON storage.objects;
CREATE POLICY "Allow upload of employee requirements"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'employee-requirements');

-- 4. Storage Policies for Update Access
DROP POLICY IF EXISTS "Allow update of employee requirements" ON storage.objects;
CREATE POLICY "Allow update of employee requirements"
ON storage.objects FOR UPDATE
USING (bucket_id = 'employee-requirements');

-- 5. Storage Policies for Deletion Access
DROP POLICY IF EXISTS "Allow delete of employee requirements" ON storage.objects;
CREATE POLICY "Allow delete of employee requirements"
ON storage.objects FOR DELETE
USING (bucket_id = 'employee-requirements');
