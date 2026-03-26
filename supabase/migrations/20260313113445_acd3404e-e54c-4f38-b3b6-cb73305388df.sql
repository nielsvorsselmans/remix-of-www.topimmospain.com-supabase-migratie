
-- Drop 3 redundant indexes on tracking_events to save ~12 MB and improve INSERT performance
DROP INDEX IF EXISTS public.idx_tracking_events_time_spent;
DROP INDEX IF EXISTS public.idx_tracking_events_session_end;
DROP INDEX IF EXISTS public.idx_tracking_events_partner;
