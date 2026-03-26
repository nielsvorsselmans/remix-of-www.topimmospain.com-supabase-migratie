-- Create function to cleanup bot tracking events
-- Removes tracking events and customer profiles for suspected bots:
-- - Visitors with <= 1 page view
-- - Older than 3 days
-- - No user_id (not a registered account)
-- - No crm_user_id (not a CRM lead)
CREATE OR REPLACE FUNCTION public.cleanup_bot_tracking_events()
RETURNS TABLE(
  deleted_tracking_events INTEGER,
  deleted_customer_profiles INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_deleted_events INTEGER;
  v_deleted_profiles INTEGER;
  v_bot_visitor_ids TEXT[];
BEGIN
  -- Find bot visitor_ids: <= 1 page view, older than 3 days, no account/CRM link
  SELECT ARRAY_AGG(DISTINCT visitor_id)
  INTO v_bot_visitor_ids
  FROM public.customer_profiles
  WHERE visitor_id IS NOT NULL
    AND user_id IS NULL
    AND crm_user_id IS NULL
    AND (engagement_data->>'total_page_views')::int <= 1
    AND created_at < now() - interval '3 days';

  -- Delete tracking events for these bot visitor_ids
  DELETE FROM public.tracking_events
  WHERE visitor_id = ANY(v_bot_visitor_ids)
    AND user_id IS NULL
    AND crm_user_id IS NULL;
  
  GET DIAGNOSTICS v_deleted_events = ROW_COUNT;

  -- Delete customer_profiles for these bot visitor_ids
  DELETE FROM public.customer_profiles
  WHERE visitor_id = ANY(v_bot_visitor_ids)
    AND user_id IS NULL
    AND crm_user_id IS NULL;
  
  GET DIAGNOSTICS v_deleted_profiles = ROW_COUNT;

  RAISE NOTICE 'Cleaned up % bot tracking events and % bot customer profiles', 
    v_deleted_events, v_deleted_profiles;

  RETURN QUERY SELECT v_deleted_events, v_deleted_profiles;
END;
$$;