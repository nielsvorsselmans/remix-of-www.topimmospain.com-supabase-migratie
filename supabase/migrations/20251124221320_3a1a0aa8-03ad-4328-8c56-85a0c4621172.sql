-- Create storage bucket for review images
INSERT INTO storage.buckets (id, name, public)
VALUES ('review-images', 'review-images', true);

-- Allow admins to upload review images
CREATE POLICY "Admins can upload review images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'review-images' 
  AND (storage.foldername(name))[1] = 'reviews'
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Allow admins to update review images
CREATE POLICY "Admins can update review images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'review-images' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Allow admins to delete review images
CREATE POLICY "Admins can delete review images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'review-images' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Allow everyone to view review images (public bucket)
CREATE POLICY "Anyone can view review images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'review-images');