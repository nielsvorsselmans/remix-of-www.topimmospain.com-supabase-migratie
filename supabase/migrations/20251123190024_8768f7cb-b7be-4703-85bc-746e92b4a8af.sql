-- Create storage bucket for team photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('team-photos', 'team-photos', true);

-- Create policy to allow public access to view team photos
CREATE POLICY "Anyone can view team photos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'team-photos');

-- Create policy to allow authenticated users to upload team photos
CREATE POLICY "Authenticated users can upload team photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'team-photos');

-- Create policy to allow authenticated users to update team photos
CREATE POLICY "Authenticated users can update team photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'team-photos');

-- Create policy to allow authenticated users to delete team photos
CREATE POLICY "Authenticated users can delete team photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'team-photos');