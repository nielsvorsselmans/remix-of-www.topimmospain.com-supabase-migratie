-- Create otp_codes table for custom OTP verification
CREATE TABLE public.otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_otp_codes_email ON public.otp_codes(email);
CREATE INDEX idx_otp_codes_email_code ON public.otp_codes(email, code);

-- Enable RLS - no policies means only service role can access
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

-- Cleanup function for old codes (older than 1 hour)
CREATE OR REPLACE FUNCTION public.cleanup_old_otp_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.otp_codes
  WHERE created_at < now() - interval '1 hour';
END;
$$;