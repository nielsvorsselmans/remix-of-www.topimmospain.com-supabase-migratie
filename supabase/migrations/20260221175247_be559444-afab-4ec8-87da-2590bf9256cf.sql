ALTER TABLE public.tracking_events ADD COLUMN event_id TEXT;
CREATE UNIQUE INDEX idx_tracking_events_event_id ON public.tracking_events (event_id) WHERE event_id IS NOT NULL;