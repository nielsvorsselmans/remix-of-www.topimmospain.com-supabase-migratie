-- Remove overly permissive anon policies on tracking_events
DROP POLICY IF EXISTS "Anon can read tracking events" ON public.tracking_events;
DROP POLICY IF EXISTS "Anon can update tracking events" ON public.tracking_events;