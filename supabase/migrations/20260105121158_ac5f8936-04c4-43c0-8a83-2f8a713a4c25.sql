-- Fix: Drop the security definer view and create a secure alternative
DROP VIEW IF EXISTS public.published_conversation_summaries;

-- Create a security invoker view (default behavior, explicitly set for clarity)
CREATE VIEW public.published_conversation_summaries 
WITH (security_invoker = true) AS
SELECT 
  id,
  summary_headline,
  summary_short,
  summary_category,
  client_pseudonym,
  key_topics,
  start_time,
  local_notes
FROM public.ghl_contact_appointments
WHERE is_summary_published = true
ORDER BY start_time DESC;

-- Grant select to authenticated users
GRANT SELECT ON public.published_conversation_summaries TO authenticated;
GRANT SELECT ON public.published_conversation_summaries TO anon;