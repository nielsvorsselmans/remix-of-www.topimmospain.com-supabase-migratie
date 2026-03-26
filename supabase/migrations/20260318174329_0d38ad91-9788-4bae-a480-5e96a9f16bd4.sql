
CREATE OR REPLACE FUNCTION public.remove_insight_from_questions(p_insight_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE content_questions 
  SET source_insight_ids = array_remove(source_insight_ids, p_insight_id::text)
  WHERE source_insight_ids @> ARRAY[p_insight_id::text];
END;
$$;
