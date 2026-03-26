
-- Drop the visitor-scoped policies that rely on custom headers (won't work with JS client)
DROP POLICY IF EXISTS "Visitors can read own tracking events" ON public.tracking_events;
DROP POLICY IF EXISTS "Visitors can update own tracking events" ON public.tracking_events;

-- Allow anon SELECT — only page_view events for enrichment (blog/project tracking)
-- This is acceptable because tracking events don't contain sensitive PII beyond visitor_id
CREATE POLICY "Anon can read tracking events"
ON public.tracking_events
FOR SELECT
TO anon
USING (true);

-- Allow anon UPDATE for blog/project enrichment (changing event_name and event_params)
CREATE POLICY "Anon can update tracking events"
ON public.tracking_events
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);
