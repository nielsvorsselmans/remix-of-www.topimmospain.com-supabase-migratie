-- Reduce buyer_data_tokens default expiry from 30 to 14 days
-- And add activity logging for audit trail

-- Update the default expires_at to 14 days instead of 30
ALTER TABLE public.buyer_data_tokens 
ALTER COLUMN expires_at SET DEFAULT (now() + interval '14 days');

-- Create activity log table for buyer form access
CREATE TABLE IF NOT EXISTS public.buyer_form_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID REFERENCES public.buyer_data_tokens(id) ON DELETE SET NULL,
  sale_customer_id UUID REFERENCES public.sale_customers(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL, -- 'token_accessed', 'data_updated', 'document_uploaded', 'cobuyer_added', 'data_completed'
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.buyer_form_activity_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view activity logs
CREATE POLICY "Admins full access buyer_form_activity_log" ON public.buyer_form_activity_log
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Service role can insert logs (used by edge function)
CREATE POLICY "Service role insert buyer_form_activity_log" ON public.buyer_form_activity_log
  FOR INSERT WITH CHECK (true);

-- Index for querying by token and time
CREATE INDEX idx_buyer_form_activity_token ON public.buyer_form_activity_log(token_id);
CREATE INDEX idx_buyer_form_activity_customer ON public.buyer_form_activity_log(sale_customer_id);
CREATE INDEX idx_buyer_form_activity_time ON public.buyer_form_activity_log(created_at DESC);