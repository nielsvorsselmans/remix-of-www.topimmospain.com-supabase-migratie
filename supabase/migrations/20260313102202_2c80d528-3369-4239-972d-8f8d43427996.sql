CREATE OR REPLACE FUNCTION public.batch_aggregate_customer_profiles()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT te.user_id, te.visitor_id, te.crm_user_id
    FROM public.tracking_events te
    WHERE te.occurred_at > now() - interval '35 minutes'
    AND (
      -- Only aggregate for logged-in users
      te.user_id IS NOT NULL
      -- Or visitors already linked to a CRM lead
      OR EXISTS (
        SELECT 1 FROM public.crm_leads cl
        WHERE cl.visitor_id = te.visitor_id
           OR te.visitor_id = ANY(cl.linked_visitor_ids)
      )
    )
  LOOP
    PERFORM aggregate_customer_profile(r.user_id, r.visitor_id, r.crm_user_id);
  END LOOP;
END;
$function$