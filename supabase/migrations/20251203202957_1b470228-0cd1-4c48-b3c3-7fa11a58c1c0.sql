-- Verhoog file size limit naar 50 MB en voeg extra MIME types toe
UPDATE storage.buckets 
SET 
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/octet-stream'
  ]
WHERE id = 'project-documents';

-- Policy voor edge function uploads (service_role)
CREATE POLICY "Service role can upload project documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'project-documents' 
  AND (auth.jwt() ->> 'role'::text) = 'service_role'::text
);