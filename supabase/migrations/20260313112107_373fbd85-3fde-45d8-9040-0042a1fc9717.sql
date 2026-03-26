CREATE OR REPLACE FUNCTION public.cleanup_old_tracking_events()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Only delete events from anonymous/unidentified visitors (14+ days old)
  -- Keep all events from identified users (user_id, crm_user_id, or linked to CRM lead) indefinitely
  DELETE FROM public.tracking_events
  WHERE occurred_at < now() - interval '14 days'
    AND user_id IS NULL
    AND crm_user_id IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.crm_leads cl
      WHERE cl.visitor_id = tracking_events.visitor_id
         OR tracking_events.visitor_id = ANY(cl.linked_visitor_ids)
    );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RAISE NOTICE 'Cleaned up % anonymous tracking events (14+ days old)', deleted_count;
  
  RETURN deleted_count;
END;
$function$;