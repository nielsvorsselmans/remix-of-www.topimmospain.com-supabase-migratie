-- Database function to upsert insights based on normalized_insight
CREATE OR REPLACE FUNCTION upsert_insight(
  p_label text,
  p_type text,
  p_raw_quote text,
  p_normalized_insight text,
  p_impact_score text,
  p_theme text,
  p_subtheme text
) RETURNS uuid AS $$
DECLARE
  v_insight_id uuid;
BEGIN
  -- Check if insight already exists based on normalized_insight
  SELECT id INTO v_insight_id 
  FROM insights 
  WHERE normalized_insight = p_normalized_insight;
  
  IF v_insight_id IS NOT NULL THEN
    -- Insight exists: increment frequency
    UPDATE insights 
    SET frequency = frequency + 1,
        updated_at = now()
    WHERE id = v_insight_id;
  ELSE
    -- New insight: insert
    INSERT INTO insights (label, type, raw_quote, normalized_insight, impact_score, theme, subtheme)
    VALUES (p_label, p_type, p_raw_quote, p_normalized_insight, p_impact_score, p_theme, p_subtheme)
    RETURNING id INTO v_insight_id;
  END IF;
  
  RETURN v_insight_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;