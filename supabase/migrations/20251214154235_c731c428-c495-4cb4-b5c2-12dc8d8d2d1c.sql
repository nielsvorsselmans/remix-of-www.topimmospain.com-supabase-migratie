-- Add last_offset column to sync_logs for checkpoint recovery
ALTER TABLE public.sync_logs 
ADD COLUMN IF NOT EXISTS last_offset integer DEFAULT 0;

-- Add index for faster status queries
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON public.sync_logs(status);

-- Comment for documentation
COMMENT ON COLUMN public.sync_logs.last_offset IS 'Last successfully processed offset for checkpoint recovery';