-- Remove the public SELECT policy from meeting_knocks
-- Admins already have full SELECT access via "Admins can view all knocks" policy
-- Guests will need to receive status updates through a different mechanism (e.g., real-time subscription or admin notification)

DROP POLICY IF EXISTS "Guests can view knocks by session" ON meeting_knocks;