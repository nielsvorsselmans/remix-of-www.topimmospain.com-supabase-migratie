-- Fix search_path for both overloads of increment_article_progress

-- Overload 1: 4 params
CREATE OR REPLACE FUNCTION public.increment_article_progress(p_report_id uuid, p_success boolean, p_error_msg text DEFAULT NULL::text, p_total_items integer DEFAULT 0)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- Overload 2: 5 params (with p_item_index)
CREATE OR REPLACE FUNCTION public.increment_article_progress(p_report_id uuid, p_success boolean, p_error_msg text DEFAULT NULL::text, p_total_items integer DEFAULT 0, p_item_index integer DEFAULT '-1'::integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_data JSONB;
  v_articles INT;
  v_errors JSONB;
  v_completed_indices JSONB;
  v_total_processed INT;
  v_error_count INT;
BEGIN
  SELECT report_data INTO v_data FROM weekly_reports WHERE id = p_report_id FOR UPDATE;
  
  v_articles := COALESCE((v_data->>'articles_created')::int, 0);
  v_errors := COALESCE(v_data->'errors', '[]'::jsonb);
  v_completed_indices := COALESCE(v_data->'completed_indices', '[]'::jsonb);
  
  IF p_success THEN
    v_articles := v_articles + 1;
    IF p_item_index >= 0 THEN
      v_completed_indices := v_completed_indices || to_jsonb(p_item_index);
    END IF;
  ELSE
    v_errors := v_errors || to_jsonb(COALESCE(p_error_msg, 'Unknown error'));
  END IF;
  
  v_error_count := jsonb_array_length(v_errors);
  v_total_processed := v_articles + v_error_count;
  
  UPDATE weekly_reports 
  SET report_data = v_data || jsonb_build_object(
        'articles_created', v_articles, 
        'errors', v_errors,
        'completed_indices', v_completed_indices
      ),
      status = CASE 
        WHEN v_total_processed >= p_total_items AND v_articles = 0 THEN 'failed'
        WHEN v_total_processed >= p_total_items AND v_error_count > 0 THEN 'partial'
        WHEN v_total_processed >= p_total_items THEN 'completed'
        ELSE 'generating'
      END,
      updated_at = NOW()
  WHERE id = p_report_id;
END;
$function$;