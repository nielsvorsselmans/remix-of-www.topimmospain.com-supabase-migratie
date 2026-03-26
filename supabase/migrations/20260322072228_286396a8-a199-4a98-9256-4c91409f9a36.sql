CREATE OR REPLACE FUNCTION increment_article_progress(
  p_report_id UUID,
  p_success BOOLEAN,
  p_error_msg TEXT DEFAULT NULL,
  p_total_items INT DEFAULT 0
) RETURNS void AS $$
DECLARE
  v_data JSONB;
  v_articles INT;
  v_errors JSONB;
  v_total_processed INT;
  v_error_count INT;
BEGIN
  SELECT report_data INTO v_data FROM weekly_reports WHERE id = p_report_id FOR UPDATE;
  
  v_articles := COALESCE((v_data->>'articles_created')::int, 0);
  v_errors := COALESCE(v_data->'errors', '[]'::jsonb);
  
  IF p_success THEN
    v_articles := v_articles + 1;
  ELSE
    v_errors := v_errors || to_jsonb(COALESCE(p_error_msg, 'Unknown error'));
  END IF;
  
  v_error_count := jsonb_array_length(v_errors);
  v_total_processed := v_articles + v_error_count;
  
  UPDATE weekly_reports 
  SET report_data = v_data || jsonb_build_object('articles_created', v_articles, 'errors', v_errors),
      status = CASE 
        WHEN v_total_processed >= p_total_items AND v_articles = 0 THEN 'failed'
        WHEN v_total_processed >= p_total_items AND v_error_count > 0 THEN 'partial'
        WHEN v_total_processed >= p_total_items THEN 'completed'
        ELSE 'generating'
      END,
      updated_at = NOW()
  WHERE id = p_report_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;