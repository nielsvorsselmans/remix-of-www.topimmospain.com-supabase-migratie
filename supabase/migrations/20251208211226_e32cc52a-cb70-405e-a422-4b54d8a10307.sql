-- Drop the security definer view and recreate as regular view with explicit SECURITY INVOKER
DROP VIEW IF EXISTS public.linkedin_connections_safe;

-- Recreate view with SECURITY INVOKER (uses caller's permissions, not definer's)
CREATE VIEW public.linkedin_connections_safe 
WITH (security_invoker = on)
AS
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

COMMENT ON VIEW public.linkedin_connections_safe IS 'Safe view excluding OAuth tokens for client-side queries. Uses SECURITY INVOKER to respect caller permissions.';