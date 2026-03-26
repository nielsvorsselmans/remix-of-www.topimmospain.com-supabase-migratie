-- Drop existing admin-only policies for review-images bucket
DROP POLICY IF EXISTS "Admins can upload review images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update review images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete review images" ON storage.objects;

-- Create new policies that allow all authenticated users
CREATE POLICY "Authenticated users can upload review images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'review-images');

CREATE POLICY "Authenticated users can update review images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'review-images');

CREATE POLICY "Authenticated users can delete review images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'review-images');