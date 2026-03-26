-- Fix team-photos bucket permissions by dropping existing and recreating
-- Drop all existing policies for team-photos bucket
DROP POLICY IF EXISTS "Anyone can view team photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload team photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update team photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete team photos" ON storage.objects;

-- Create permissive policies for team-photos bucket
-- Allow public viewing
CREATE POLICY "Public can view team photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'team-photos');

-- Allow public upload
CREATE POLICY "Public can upload team photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'team-photos');

-- Allow public update
CREATE POLICY "Public can update team photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'team-photos');

-- Allow public delete
CREATE POLICY "Public can delete team photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'team-photos');