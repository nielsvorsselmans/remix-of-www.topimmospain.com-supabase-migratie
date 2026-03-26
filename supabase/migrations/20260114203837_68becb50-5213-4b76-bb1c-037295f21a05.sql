-- Create the material-images storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'material-images',
  'material-images', 
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- RLS policies for admins to upload
CREATE POLICY "Admins can upload material images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'material-images' AND
  public.has_role(auth.uid(), 'admin')
);

-- Anyone can view images (public bucket)
CREATE POLICY "Anyone can view material images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'material-images');

-- Admins can delete
CREATE POLICY "Admins can delete material images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'material-images' AND
  public.has_role(auth.uid(), 'admin')
);