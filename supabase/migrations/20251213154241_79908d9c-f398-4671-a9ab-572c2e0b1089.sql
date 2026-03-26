-- Create temp-uploads bucket for ZIP files
INSERT INTO storage.buckets (id, name, public)
VALUES ('temp-uploads', 'temp-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policy: authenticated users can upload temp files
CREATE POLICY "Authenticated users can upload temp files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'temp-uploads');

-- RLS policy: authenticated users can read temp files
CREATE POLICY "Authenticated users can read temp files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'temp-uploads');

-- RLS policy: service role can delete temp files
CREATE POLICY "Service role can delete temp files"
ON storage.objects FOR DELETE
TO service_role
USING (bucket_id = 'temp-uploads');