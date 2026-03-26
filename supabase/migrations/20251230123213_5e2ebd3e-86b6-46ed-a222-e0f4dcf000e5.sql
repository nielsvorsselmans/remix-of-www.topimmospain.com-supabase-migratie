-- Create google_business_connections table for OAuth tokens
CREATE TABLE public.google_business_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  account_id TEXT NOT NULL,
  account_name TEXT,
  location_id TEXT NOT NULL,
  location_name TEXT,
  access_token TEXT,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  total_reviews_synced INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(account_id, location_id)
);

-- Enable RLS
ALTER TABLE public.google_business_connections ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "Admins can view all google business connections"
ON public.google_business_connections
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Admins can insert google business connections"
ON public.google_business_connections
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Admins can update google business connections"
ON public.google_business_connections
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Admins can delete google business connections"
ON public.google_business_connections
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Add new columns to reviews table
ALTER TABLE public.reviews 
ADD COLUMN IF NOT EXISTS google_author_photo_url TEXT,
ADD COLUMN IF NOT EXISTS google_review_reply TEXT,
ADD COLUMN IF NOT EXISTS google_review_reply_time TIMESTAMPTZ;

-- Create trigger for updated_at
CREATE TRIGGER update_google_business_connections_updated_at
BEFORE UPDATE ON public.google_business_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();