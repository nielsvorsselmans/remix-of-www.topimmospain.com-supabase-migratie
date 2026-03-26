-- Create buyer_data_tokens table for public self-service links
CREATE TABLE public.buyer_data_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_customer_id UUID NOT NULL REFERENCES public.sale_customers(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '30 days'),
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create index for fast token lookups
CREATE INDEX idx_buyer_data_tokens_token ON public.buyer_data_tokens(token);
CREATE INDEX idx_buyer_data_tokens_sale_customer_id ON public.buyer_data_tokens(sale_customer_id);

-- Enable RLS
ALTER TABLE public.buyer_data_tokens ENABLE ROW LEVEL SECURITY;

-- Only admins can create/view tokens (public access is via edge function)
CREATE POLICY "Admins can manage buyer data tokens"
ON public.buyer_data_tokens
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can manage tokens (for edge function)
CREATE POLICY "Service role can manage buyer data tokens"
ON public.buyer_data_tokens
FOR ALL
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Add comment
COMMENT ON TABLE public.buyer_data_tokens IS 'Tokens for public self-service buyer data forms';