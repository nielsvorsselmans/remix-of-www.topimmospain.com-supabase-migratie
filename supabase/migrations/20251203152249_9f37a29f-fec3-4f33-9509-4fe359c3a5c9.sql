-- Add media_type and image_urls columns to project_videos
ALTER TABLE public.project_videos 
ADD COLUMN media_type TEXT NOT NULL DEFAULT 'video',
ADD COLUMN image_urls JSONB DEFAULT '[]'::jsonb;

-- Add constraint for valid media types
ALTER TABLE public.project_videos 
ADD CONSTRAINT valid_media_type CHECK (media_type IN ('video', 'photo', 'gallery'));

-- Create storage bucket for project media (photos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-media',
  'project-media', 
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
);

-- RLS policies for project-media bucket
CREATE POLICY "Anyone can view project media"
ON storage.objects FOR SELECT
USING (bucket_id = 'project-media');

CREATE POLICY "Admins can upload project media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'project-media' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update project media"
ON storage.objects FOR UPDATE
USING (bucket_id = 'project-media' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete project media"
ON storage.objects FOR DELETE
USING (bucket_id = 'project-media' AND has_role(auth.uid(), 'admin'));