-- Create visual_templates table for storing reusable templates
CREATE TABLE public.visual_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('carousel', 'story', 'ad', 'newscard')),
  format_type TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  template_data JSONB NOT NULL DEFAULT '{}',
  thumbnail_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create visual_exports table for export history
CREATE TABLE public.visual_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.visual_templates(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  export_type TEXT NOT NULL CHECK (export_type IN ('png', 'pdf', 'zip')),
  file_url TEXT NOT NULL,
  file_name TEXT,
  metadata JSONB DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.visual_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visual_exports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for visual_templates (admin only for write, all authenticated for read)
CREATE POLICY "Anyone can view active templates"
ON public.visual_templates
FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "Admins can manage templates"
ON public.visual_templates
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for visual_exports
CREATE POLICY "Users can view their own exports"
ON public.visual_exports
FOR SELECT
TO authenticated
USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can create exports"
ON public.visual_exports
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can manage all exports"
ON public.visual_exports
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create updated_at trigger for visual_templates
CREATE TRIGGER update_visual_templates_updated_at
BEFORE UPDATE ON public.visual_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default templates
INSERT INTO public.visual_templates (name, category, format_type, width, height, template_data) VALUES
-- LinkedIn Carousel Templates
('Project Showcase', 'carousel', 'linkedin_carousel', 1080, 1350, '{"slideCount": 5, "theme": "professional", "elements": ["headline", "image", "stats", "cta"]}'),
('Educatieve Tips', 'carousel', 'linkedin_carousel', 1080, 1350, '{"slideCount": 6, "theme": "educational", "elements": ["number", "tip", "icon"]}'),
('Investeren 101', 'carousel', 'linkedin_carousel', 1080, 1350, '{"slideCount": 7, "theme": "guide", "elements": ["step", "description", "visual"]}'),
('Markt Update', 'carousel', 'linkedin_carousel', 1080, 1350, '{"slideCount": 4, "theme": "data", "elements": ["chart", "stat", "insight"]}'),

-- Instagram Story Templates
('Nieuw Project', 'story', 'instagram_story', 1080, 1920, '{"theme": "reveal", "elements": ["image", "price", "location", "swipeUp"]}'),
('Testimonial', 'story', 'instagram_story', 1080, 1920, '{"theme": "quote", "elements": ["quote", "author", "rating"]}'),
('Tip van de Week', 'story', 'instagram_story', 1080, 1920, '{"theme": "tip", "elements": ["icon", "tipText", "cta"]}'),
('Behind the Scenes', 'story', 'instagram_story', 1080, 1920, '{"theme": "casual", "elements": ["photo", "caption"]}'),

-- Ad Templates
('Project Highlight', 'ad', 'multi_format', 1200, 628, '{"formats": ["facebook_feed", "instagram_feed", "linkedin"], "elements": ["image", "headline", "usp", "cta"]}'),
('Rendement Focus', 'ad', 'multi_format', 1200, 628, '{"formats": ["facebook_feed", "instagram_feed"], "elements": ["stats", "headline", "cta"]}'),
('Lifestyle', 'ad', 'multi_format', 1200, 628, '{"formats": ["facebook_feed", "instagram_feed", "instagram_story"], "elements": ["lifestyle_image", "tagline"]}'),

-- News Card Templates
('Nieuws Update', 'newscard', 'social_card', 1080, 1350, '{"theme": "news", "elements": ["tag", "headline", "image", "lead"]}'),
('Expertise Artikel', 'newscard', 'social_card', 1080, 1350, '{"theme": "expertise", "elements": ["tag", "headline", "image", "lead"]}');