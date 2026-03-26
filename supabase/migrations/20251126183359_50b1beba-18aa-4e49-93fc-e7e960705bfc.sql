-- Create linkedin_connections table
CREATE TABLE public.linkedin_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  linkedin_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  profile_name TEXT,
  profile_image TEXT,
  profile_headline TEXT,
  scopes_granted TEXT[] DEFAULT '{}',
  connected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create linkedin_posts table
CREATE TABLE public.linkedin_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  linkedin_connection_id UUID NOT NULL REFERENCES public.linkedin_connections(id) ON DELETE CASCADE,
  linkedin_post_urn TEXT NOT NULL UNIQUE,
  content_text TEXT,
  media_urls JSONB DEFAULT '[]',
  visibility TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  impressions_count INTEGER DEFAULT 0,
  engagement_rate NUMERIC(5,2),
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.linkedin_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.linkedin_posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for linkedin_connections
CREATE POLICY "Admins can view all LinkedIn connections"
  ON public.linkedin_connections FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own LinkedIn connection"
  ON public.linkedin_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own LinkedIn connection"
  ON public.linkedin_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own LinkedIn connection"
  ON public.linkedin_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own LinkedIn connection"
  ON public.linkedin_connections FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for linkedin_posts
CREATE POLICY "Admins can view all LinkedIn posts"
  ON public.linkedin_posts FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own LinkedIn posts"
  ON public.linkedin_posts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.linkedin_connections
      WHERE linkedin_connections.id = linkedin_posts.linkedin_connection_id
      AND linkedin_connections.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage all LinkedIn posts"
  ON public.linkedin_posts FOR ALL
  USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Create indexes
CREATE INDEX idx_linkedin_connections_user_id ON public.linkedin_connections(user_id);
CREATE INDEX idx_linkedin_posts_connection_id ON public.linkedin_posts(linkedin_connection_id);
CREATE INDEX idx_linkedin_posts_published_at ON public.linkedin_posts(published_at DESC);

-- Create updated_at trigger
CREATE TRIGGER update_linkedin_connections_updated_at
  BEFORE UPDATE ON public.linkedin_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_linkedin_posts_updated_at
  BEFORE UPDATE ON public.linkedin_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();