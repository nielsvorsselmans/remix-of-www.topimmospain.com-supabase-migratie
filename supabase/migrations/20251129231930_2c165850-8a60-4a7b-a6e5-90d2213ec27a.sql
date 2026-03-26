-- Remove faulty trigger that references non-existent updated_at column
DROP TRIGGER IF EXISTS update_tracking_events_updated_at ON tracking_events;