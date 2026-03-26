-- Add unique constraint on email + event_id to prevent duplicate registrations
-- Uses LOWER(email) to handle case-insensitive matching
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_email_event 
ON public.info_evening_registrations(LOWER(email), event_id);