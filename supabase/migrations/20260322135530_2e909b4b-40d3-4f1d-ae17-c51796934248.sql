
CREATE TABLE public.social_post_generations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  social_post_id UUID REFERENCES public.social_posts(id) ON DELETE SET NULL,
  blog_post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  step TEXT NOT NULL,
  briefing_snapshot JSONB DEFAULT '{}'::jsonb,
  prompts_snapshot JSONB DEFAULT '{}'::jsonb,
  model_used TEXT,
  raw_ai_response TEXT,
  polish_result TEXT,
  enrichment_data JSONB DEFAULT '{}'::jsonb,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.social_post_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage generations"
  ON public.social_post_generations
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_social_post_generations_blog ON public.social_post_generations(blog_post_id);
CREATE INDEX idx_social_post_generations_post ON public.social_post_generations(social_post_id);
