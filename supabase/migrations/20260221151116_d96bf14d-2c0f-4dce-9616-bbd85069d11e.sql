
-- Storage bucket for external listing images
INSERT INTO storage.buckets (id, name, public)
VALUES ('external-listing-images', 'external-listing-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read images (public bucket)
CREATE POLICY "Public read access for external listing images"
ON storage.objects FOR SELECT
USING (bucket_id = 'external-listing-images');

-- Only authenticated users can upload
CREATE POLICY "Authenticated users can upload external listing images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'external-listing-images' AND auth.role() = 'authenticated');

-- Only authenticated users can delete their uploads
CREATE POLICY "Authenticated users can delete external listing images"
ON storage.objects FOR DELETE
USING (bucket_id = 'external-listing-images' AND auth.role() = 'authenticated');
