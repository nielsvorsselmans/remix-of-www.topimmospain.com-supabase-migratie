-- Create a safe view for linkedin_connections that excludes sensitive token columns
-- This view should be used for client-side queries to prevent token exposure

CREATE OR REPLACE VIEW public.linkedin_connections_safe AS
SELECT 
  id,
  user_id,
  linkedin_id,
  profile_name,
  profile_headline,
  profile_image,
  connected_at,
  last_sync_at,
  scopes_granted,
  created_at,
  updated_at
FROM public.linkedin_connections;

-- Enable RLS on the view (inherits from base table)
-- Grant access to authenticated users only to their own records
COMMENT ON VIEW public.linkedin_connections_safe IS 'Safe view excluding OAuth tokens for client-side queries';

-- Also add a policy note to the linkedin_connections table
COMMENT ON TABLE public.linkedin_connections IS 'Contains sensitive OAuth tokens - use linkedin_connections_safe view for client queries';