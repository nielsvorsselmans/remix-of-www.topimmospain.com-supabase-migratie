-- Create social media library table
CREATE TABLE public.social_media_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  category TEXT CHECK (category IN ('project', 'lifestyle', 'investment', 'spain', 'custom')),
  tags TEXT[],
  source TEXT CHECK (source IN ('upload', 'ai_generated', 'project')) DEFAULT 'upload',
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  created_by UUID,
  usage_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.social_media_library ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for admins
CREATE POLICY "Admins can view media library" ON public.social_media_library
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can insert media" ON public.social_media_library
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update media" ON public.social_media_library
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete media" ON public.social_media_library
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Create storage bucket for social media images
INSERT INTO storage.buckets (id, name, public)
VALUES ('social-media-images', 'social-media-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for social media images
CREATE POLICY "Public read access for social media images"
ON storage.objects FOR SELECT
USING (bucket_id = 'social-media-images');

CREATE POLICY "Admins can upload social media images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'social-media-images' 
  AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can update social media images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'social-media-images' 
  AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can delete social media images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'social-media-images' 
  AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Add updated_at trigger
CREATE TRIGGER update_social_media_library_updated_at
  BEFORE UPDATE ON public.social_media_library
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();