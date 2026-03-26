-- Drop the per-insert aggregate trigger
DROP TRIGGER IF EXISTS trg_aggregate_customer_profile ON public.tracking_events;

-- Create batch aggregate function for cron
CREATE OR REPLACE FUNCTION public.batch_aggregate_customer_profiles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT user_id, visitor_id, crm_user_id
    FROM public.tracking_events
    WHERE occurred_at > now() - interval '10 minutes'
    AND (user_id IS NOT NULL OR visitor_id IS NOT NULL)
  LOOP
    PERFORM aggregate_customer_profile(r.user_id, r.visitor_id, r.crm_user_id);
  END LOOP;
END;
$$;