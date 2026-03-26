
-- Create photo category enum
CREATE TYPE public.linkedin_photo_category AS ENUM ('headshot', 'speaking', 'location', 'lifestyle', 'office');

-- Create linkedin_photo_library table
CREATE TABLE public.linkedin_photo_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url TEXT NOT NULL,
  category linkedin_photo_category NOT NULL DEFAULT 'headshot',
  tags TEXT[] DEFAULT '{}',
  times_used INT NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.linkedin_photo_library ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "Admins can do everything on linkedin_photo_library"
  ON public.linkedin_photo_library
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add photo_id to social_posts
ALTER TABLE public.social_posts ADD COLUMN photo_id UUID REFERENCES public.linkedin_photo_library(id) ON DELETE SET NULL;

-- Create storage bucket for linkedin photos
INSERT INTO storage.buckets (id, name, public) VALUES ('linkedin-photos', 'linkedin-photos', true);

-- Storage RLS: anyone can read (public bucket)
CREATE POLICY "Anyone can read linkedin photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'linkedin-photos');

-- Only admins can upload/delete
CREATE POLICY "Admins can upload linkedin photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'linkedin-photos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete linkedin photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'linkedin-photos' AND public.has_role(auth.uid(), 'admin'));
