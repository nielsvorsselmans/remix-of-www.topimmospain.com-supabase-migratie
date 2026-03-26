-- Create trigger function to update crm_leads.last_visit_at when tracking events are inserted
CREATE OR REPLACE FUNCTION public.update_crm_lead_last_visit()
RETURNS TRIGGER AS $$
BEGIN
  -- Update crm_lead via user_id
  IF NEW.user_id IS NOT NULL THEN
    UPDATE public.crm_leads 
    SET last_visit_at = NEW.occurred_at
    WHERE user_id = NEW.user_id
      AND (last_visit_at IS NULL OR last_visit_at < NEW.occurred_at);
  END IF;
  
  -- Update crm_lead via visitor_id (fallback for non-logged-in users)
  IF NEW.visitor_id IS NOT NULL AND NEW.user_id IS NULL THEN
    UPDATE public.crm_leads 
    SET last_visit_at = NEW.occurred_at
    WHERE visitor_id = NEW.visitor_id
      AND (last_visit_at IS NULL OR last_visit_at < NEW.occurred_at);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger that fires on page_view events
CREATE TRIGGER sync_crm_lead_last_visit
AFTER INSERT ON public.tracking_events
FOR EACH ROW
WHEN (NEW.event_name = 'page_view')
EXECUTE FUNCTION public.update_crm_lead_last_visit();

-- Repair historical data: update all crm_leads with their most recent tracking event
UPDATE public.crm_leads cl
SET last_visit_at = latest.max_occurred
FROM (
  SELECT 
    te.user_id,
    te.visitor_id,
    MAX(te.occurred_at) as max_occurred
  FROM public.tracking_events te
  WHERE te.event_name = 'page_view'
  GROUP BY te.user_id, te.visitor_id
) latest
WHERE (
  (cl.user_id IS NOT NULL AND cl.user_id = latest.user_id)
  OR (cl.visitor_id IS NOT NULL AND cl.visitor_id = latest.visitor_id AND latest.user_id IS NULL)
)
AND (cl.last_visit_at IS NULL OR cl.last_visit_at < latest.max_occurred);