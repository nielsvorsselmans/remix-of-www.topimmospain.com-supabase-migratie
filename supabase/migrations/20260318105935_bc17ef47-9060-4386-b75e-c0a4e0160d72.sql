
-- Add underlying_questions column to insights table
ALTER TABLE public.insights ADD COLUMN IF NOT EXISTS underlying_questions text[];

-- Recreate upsert_insight function with underlying_questions parameter
DROP FUNCTION IF EXISTS public.upsert_insight(text, text, text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.upsert_insight(
  p_label text,
  p_raw_quote text,
  p_normalized_insight text,
  p_type text,
  p_theme text DEFAULT NULL,
  p_subtheme text DEFAULT NULL,
  p_impact_score text DEFAULT NULL,
  p_suggested_archetype text DEFAULT NULL,
  p_underlying_questions text[] DEFAULT NULL
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
      underlying_questions = CASE 
        WHEN p_underlying_questions IS NOT NULL THEN
          (SELECT array_agg(DISTINCT q) FROM unnest(COALESCE(underlying_questions, '{}') || p_underlying_questions) AS q)
        ELSE underlying_questions
      END
    WHERE id = v_id;
  ELSE
    INSERT INTO public.insights (
      label, raw_quote, normalized_insight, type, theme, subtheme,
      impact_score, suggested_archetype, frequency, underlying_questions
    )
    VALUES (
      p_label, p_raw_quote, p_normalized_insight, p_type, p_theme, p_subtheme,
      p_impact_score, p_suggested_archetype, 1, p_underlying_questions
    )
    RETURNING id INTO v_id;
  END IF;
  
  RETURN v_id;
END;
$$;
