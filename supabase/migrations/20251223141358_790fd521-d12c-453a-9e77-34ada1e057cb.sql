-- Add Data Portability API columns to linkedin_connections
ALTER TABLE public.linkedin_connections
ADD COLUMN IF NOT EXISTS dpa_access_token TEXT,
ADD COLUMN IF NOT EXISTS dpa_token_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS dpa_enabled BOOLEAN DEFAULT false;