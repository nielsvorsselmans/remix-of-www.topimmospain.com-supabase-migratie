-- Drop and recreate the view to include summary_full and remove local_notes
DROP VIEW IF EXISTS public.published_conversation_summaries;

CREATE VIEW public.published_conversation_summaries WITH (security_invoker = true) AS
SELECT 
  id,
  summary_headline,
  summary_short,
  summary_full,
  summary_category,
  client_pseudonym,
  key_topics,
  start_time
FROM public.ghl_contact_appointments
WHERE is_summary_published = true
  AND summary_headline IS NOT NULL
ORDER BY start_time DESC;

-- Grant access to the view
GRANT SELECT ON public.published_conversation_summaries TO authenticated;
GRANT SELECT ON public.published_conversation_summaries TO anon;