
-- Create content_briefings table
CREATE TABLE public.content_briefings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'draft',
  source_question_id uuid REFERENCES public.content_questions(id) ON DELETE SET NULL,
  source_insight_id uuid REFERENCES public.insights(id) ON DELETE SET NULL,
  source_type text NOT NULL DEFAULT 'idea',
  source_text text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'Algemeen',
  briefing_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  raw_brainstorm text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.content_briefings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access (admin-only table)
CREATE POLICY "Authenticated users can manage briefings"
  ON public.content_briefings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
