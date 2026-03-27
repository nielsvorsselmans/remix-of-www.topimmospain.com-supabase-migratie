-- Extend tracking_events table with time tracking columns
ALTER TABLE public.tracking_events
ADD COLUMN IF NOT EXISTS time_spent_seconds integer,
ADD COLUMN IF NOT EXISTS session_end timestamp with time zone,
ADD COLUMN IF NOT EXISTS visibility_changes integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_heartbeat timestamp with time zone;

-- Add index for efficient queries on time spent
CREATE INDEX IF NOT EXISTS idx_tracking_events_time_spent ON public.tracking_events(time_spent_seconds);

-- Add index for session end queries
CREATE INDEX IF NOT EXISTS idx_tracking_events_session_end ON public.tracking_events(session_end);

-- Delete the cleanup cron job if it exists (safe on fresh installations)
DO $$
BEGIN
  PERFORM cron.unschedule('cleanup-tracking-events-daily');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;