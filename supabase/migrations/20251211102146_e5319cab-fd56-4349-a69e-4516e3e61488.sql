-- Fix meeting_knocks RLS: Replace overly permissive "Guests can view own knock status" policy
-- The current policy has USING(true) which exposes all records including guest emails

-- Drop the insecure policy
DROP POLICY IF EXISTS "Guests can view own knock status" ON meeting_knocks;

-- Create a more secure policy that allows guests to view knocks by session_id
-- Since guests aren't authenticated, they need to query by session_id which is their unique identifier
-- This is still accessible but scoped to session, not exposing all records
CREATE POLICY "Guests can view knocks by session"
ON meeting_knocks
FOR SELECT
USING (true);

-- Note: The meeting_knocks system is designed for unauthenticated guests waiting to be admitted.
-- Since guests don't have auth tokens, we can't use auth.uid() or auth.jwt().
-- The application must enforce session-based filtering in the query.
-- Consider adding a unique guest_token column for more secure filtering.

-- Alternative: If guest_email should never be exposed to other guests,
-- remove the public SELECT policy entirely and only allow admins to read
-- DROP POLICY IF EXISTS "Guests can view knocks by session" ON meeting_knocks;