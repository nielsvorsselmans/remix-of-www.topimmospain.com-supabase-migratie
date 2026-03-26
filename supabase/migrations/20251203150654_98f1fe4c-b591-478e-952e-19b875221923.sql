-- Create project_videos table for video metadata
CREATE TABLE public.project_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  video_date DATE NOT NULL,
  video_type TEXT NOT NULL DEFAULT 'bouwupdate',
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create project_video_links table for many-to-many relationships
CREATE TABLE public.project_video_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.project_videos(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  order_index INTEGER DEFAULT 0,
  visible_public BOOLEAN DEFAULT true,
  visible_portal BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(video_id, project_id)
);

-- Enable RLS
ALTER TABLE public.project_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_video_links ENABLE ROW LEVEL SECURITY;

-- RLS policies for project_videos
CREATE POLICY "Anyone can view videos linked to public projects"
ON public.project_videos FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.project_video_links
    WHERE project_video_links.video_id = project_videos.id
    AND project_video_links.visible_public = true
  )
);

CREATE POLICY "Admins can manage all videos"
ON public.project_videos FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for project_video_links
CREATE POLICY "Anyone can view public video links"
ON public.project_video_links FOR SELECT
USING (visible_public = true);

CREATE POLICY "Authenticated users can view portal video links"
ON public.project_video_links FOR SELECT
USING (visible_portal = true AND auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage all video links"
ON public.project_video_links FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for performance
CREATE INDEX idx_project_video_links_video_id ON public.project_video_links(video_id);
CREATE INDEX idx_project_video_links_project_id ON public.project_video_links(project_id);

-- Update trigger for project_videos
CREATE TRIGGER update_project_videos_updated_at
BEFORE UPDATE ON public.project_videos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();