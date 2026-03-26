
-- 1. Add buyer_phase and conversation_richness to conversations
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS buyer_phase text;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS conversation_richness integer;

-- 2. Add extraction_confidence to insights
ALTER TABLE public.insights ADD COLUMN IF NOT EXISTS extraction_confidence integer;

-- 3. Change underlying_questions from text[] to jsonb on insights
-- We keep text[] for backward compat but add a new column for structured questions
ALTER TABLE public.insights ADD COLUMN IF NOT EXISTS structured_questions jsonb DEFAULT '[]'::jsonb;

-- 4. Create content_questions table for cross-conversation question clustering
CREATE TABLE IF NOT EXISTS public.content_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  search_intent text NOT NULL DEFAULT 'INFORMATIONAL',
  search_volume_hint text DEFAULT 'midden',
  source_insight_ids uuid[] DEFAULT '{}',
  buyer_phases text[] DEFAULT '{}',
  frequency integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS but allow authenticated users to read
ALTER TABLE public.content_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read content_questions"
  ON public.content_questions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage content_questions"
  ON public.content_questions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Update upsert_insight to accept extraction_confidence
DROP FUNCTION IF EXISTS public.upsert_insight(text, text, text, text, text, text, text, text, text[]);

CREATE OR REPLACE FUNCTION public.upsert_insight(
  p_label text,
  p_raw_quote text,
  p_normalized_insight text,
  p_type text,
  p_theme text DEFAULT NULL,
  p_subtheme text DEFAULT NULL,
  p_impact_score text DEFAULT NULL,
  p_suggested_archetype text DEFAULT NULL,
  p_underlying_questions text[] DEFAULT NULL,
  p_extraction_confidence integer DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id
  FROM public.insights
  WHERE normalized_insight = p_normalized_insight
  LIMIT 1;
  
  IF v_id IS NOT NULL THEN
    UPDATE public.insights
    SET 
      frequency = COALESCE(frequency, 1) + 1,
      updated_at = now(),
      theme = COALESCE(p_theme, theme),
      subtheme = COALESCE(p_subtheme, subtheme),
      impact_score = COALESCE(p_impact_score, impact_score),
      suggested_archetype = COALESCE(p_suggested_archetype, suggested_archetype),
      extraction_confidence = COALESCE(p_extraction_confidence, extraction_confidence),
      underlying_questions = CASE 
        WHEN p_underlying_questions IS NOT NULL THEN
          (SELECT array_agg(DISTINCT q) FROM unnest(COALESCE(underlying_questions, '{}') || p_underlying_questions) AS q)
        ELSE underlying_questions
      END
    WHERE id = v_id;
  ELSE
    INSERT INTO public.insights (
      label, raw_quote, normalized_insight, type, theme, subtheme,
      impact_score, suggested_archetype, frequency, underlying_questions, extraction_confidence
    )
    VALUES (
      p_label, p_raw_quote, p_normalized_insight, p_type, p_theme, p_subtheme,
      p_impact_score, p_suggested_archetype, 1, p_underlying_questions, p_extraction_confidence
    )
    RETURNING id INTO v_id;
  END IF;
  
  RETURN v_id;
END;
$$;
