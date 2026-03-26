
-- Pipeline audit log table
CREATE TABLE public.content_pipeline_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  briefing_id UUID REFERENCES public.content_briefings(id) ON DELETE CASCADE,
  step TEXT NOT NULL,
  model_id TEXT,
  prompt_snapshot TEXT,
  input_context JSONB,
  output_data JSONB,
  output_raw TEXT,
  version INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Extra columns on content_briefings for intermediate state
ALTER TABLE public.content_briefings
  ADD COLUMN IF NOT EXISTS article_data JSONB,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS seo_research JSONB,
  ADD COLUMN IF NOT EXISTS source_context JSONB;

-- RLS
ALTER TABLE public.content_pipeline_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read pipeline logs"
  ON public.content_pipeline_logs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert pipeline logs"
  ON public.content_pipeline_logs FOR INSERT TO authenticated WITH CHECK (true);
