
ALTER TABLE public.blog_posts 
ADD COLUMN source_insight_id uuid REFERENCES public.insights(id) ON DELETE SET NULL,
ADD COLUMN source_tension_id uuid REFERENCES public.content_tensions(id) ON DELETE SET NULL;
