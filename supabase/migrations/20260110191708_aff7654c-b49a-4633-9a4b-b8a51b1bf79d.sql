-- Voeg suggested_archetype kolom toe aan insights
ALTER TABLE insights 
ADD COLUMN suggested_archetype text;

-- Update de upsert_insight functie om de nieuwe parameter te accepteren
CREATE OR REPLACE FUNCTION upsert_insight(
  p_label text,
  p_type text,
  p_raw_quote text,
  p_normalized_insight text,
  p_impact_score text,
  p_theme text,
  p_subtheme text,
  p_suggested_archetype text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_insight_id uuid;
BEGIN
  -- Check if insight already exists based on normalized_insight
  SELECT id INTO v_insight_id 
  FROM insights 
  WHERE normalized_insight = p_normalized_insight;
  
  IF v_insight_id IS NOT NULL THEN
    -- Insight exists: increment frequency, update archetype if provided
    UPDATE insights 
    SET frequency = frequency + 1,
        updated_at = now(),
        suggested_archetype = COALESCE(p_suggested_archetype, suggested_archetype)
    WHERE id = v_insight_id;
  ELSE
    -- New insight: insert
    INSERT INTO insights (label, type, raw_quote, normalized_insight, impact_score, theme, subtheme, suggested_archetype)
    VALUES (p_label, p_type, p_raw_quote, p_normalized_insight, p_impact_score, p_theme, p_subtheme, p_suggested_archetype)
    RETURNING id INTO v_insight_id;
  END IF;
  
  RETURN v_insight_id;
END;
$$;