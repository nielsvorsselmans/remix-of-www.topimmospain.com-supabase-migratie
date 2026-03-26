-- Create tracking_events table for local backup
CREATE TABLE IF NOT EXISTS public.tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  site TEXT NOT NULL,
  path TEXT NOT NULL,
  full_url TEXT NOT NULL,
  referrer TEXT,
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- UTM parameters
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  
  -- User/CRM info
  account_id UUID,
  crm_user_id TEXT,
  user_id UUID,
  
  -- Device info
  device_type TEXT,
  browser TEXT,
  browser_version TEXT,
  os TEXT,
  os_version TEXT,
  screen_width INTEGER,
  screen_height INTEGER,
  locale TEXT,
  
  -- Event specific data
  event_params JSONB DEFAULT '{}'::jsonb,
  
  -- Tracking metadata
  synced_to_external BOOLEAN DEFAULT false,
  external_sync_error TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_tracking_events_occurred_at ON public.tracking_events(occurred_at DESC);
CREATE INDEX idx_tracking_events_visitor_id ON public.tracking_events(visitor_id);
CREATE INDEX idx_tracking_events_event_name ON public.tracking_events(event_name);
CREATE INDEX idx_tracking_events_user_id ON public.tracking_events(user_id) WHERE user_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.tracking_events ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can do everything (for edge functions)
CREATE POLICY "Service role can manage tracking events"
  ON public.tracking_events
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Policy: Admins can view all tracking events
CREATE POLICY "Admins can view all tracking events"
  ON public.tracking_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Function to cleanup old tracking events (older than 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_tracking_events()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.tracking_events
  WHERE occurred_at < now() - interval '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RAISE NOTICE 'Cleaned up % old tracking events', deleted_count;
  
  RETURN deleted_count;
END;
$$;

-- Create updated_at trigger for tracking_events
CREATE TRIGGER update_tracking_events_updated_at
  BEFORE UPDATE ON public.tracking_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();