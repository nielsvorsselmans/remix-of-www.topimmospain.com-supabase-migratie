
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Service role can manage tracking events" ON public.tracking_events;

-- Allow anonymous INSERT (visitors tracking without auth)
CREATE POLICY "Anyone can insert tracking events"
ON public.tracking_events
FOR INSERT
TO public
WITH CHECK (true);

-- Allow anonymous SELECT scoped to own visitor_id (for blog/project enrichment)
CREATE POLICY "Visitors can read own tracking events"
ON public.tracking_events
FOR SELECT
TO public
USING (
  visitor_id IS NOT NULL 
  AND visitor_id = current_setting('request.headers', true)::json->>'x-visitor-id'
);

-- Allow anonymous UPDATE scoped to own visitor_id (for blog/project view enrichment)
CREATE POLICY "Visitors can update own tracking events"
ON public.tracking_events
FOR UPDATE
TO public
USING (
  visitor_id IS NOT NULL
  AND visitor_id = current_setting('request.headers', true)::json->>'x-visitor-id'
)
WITH CHECK (
  visitor_id IS NOT NULL
  AND visitor_id = current_setting('request.headers', true)::json->>'x-visitor-id'
);

-- Admin users can read all tracking events
CREATE POLICY "Admins can read all tracking events"
ON public.tracking_events
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
