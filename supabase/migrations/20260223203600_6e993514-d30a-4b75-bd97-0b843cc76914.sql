
-- 1. Index on action_type for future filtering
CREATE INDEX IF NOT EXISTS idx_milestone_activity_log_action_type 
ON public.sale_milestone_activity_log (action_type);

-- 2. Cleanup function for old activity log entries (older than 1 year)
CREATE OR REPLACE FUNCTION public.cleanup_old_milestone_activity_logs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.sale_milestone_activity_log
  WHERE created_at < now() - interval '1 year'
  AND action_type != 'note_added';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Cleaned up % old milestone activity log entries', deleted_count;
  RETURN deleted_count;
END;
$$;
