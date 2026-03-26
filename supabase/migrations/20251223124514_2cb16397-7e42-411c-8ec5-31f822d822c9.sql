-- Create linkedin_api_logs table for tracking API calls
CREATE TABLE public.linkedin_api_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  endpoint text NOT NULL,
  status_code integer,
  error_message text,
  request_data jsonb,
  response_data jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.linkedin_api_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all API logs
CREATE POLICY "Admins can view linkedin_api_logs"
  ON public.linkedin_api_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can manage all logs
CREATE POLICY "Service role can manage linkedin_api_logs"
  ON public.linkedin_api_logs
  FOR ALL
  USING ((auth.jwt() ->> 'role') = 'service_role');

-- Add member_urn column to linkedin_connections if it doesn't exist
ALTER TABLE public.linkedin_connections 
ADD COLUMN IF NOT EXISTS member_urn text;

-- Add index for faster queries by user
CREATE INDEX idx_linkedin_api_logs_user_id ON public.linkedin_api_logs(user_id);
CREATE INDEX idx_linkedin_api_logs_created_at ON public.linkedin_api_logs(created_at DESC);