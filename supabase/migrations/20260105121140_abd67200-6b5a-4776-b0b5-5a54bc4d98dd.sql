-- Add columns for publishing conversation summaries to ghl_contact_appointments
ALTER TABLE public.ghl_contact_appointments
ADD COLUMN is_summary_published BOOLEAN DEFAULT false,
ADD COLUMN summary_headline TEXT,
ADD COLUMN summary_short TEXT,
ADD COLUMN summary_category TEXT,
ADD COLUMN client_pseudonym TEXT,
ADD COLUMN key_topics TEXT[];

-- Create index for efficient querying of published summaries
CREATE INDEX idx_ghl_appointments_published ON public.ghl_contact_appointments(is_summary_published) WHERE is_summary_published = true;

-- Create a view for public access to published summaries (without sensitive data)
CREATE VIEW public.published_conversation_summaries AS
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

-- Enable RLS on the view by granting select to authenticated users
GRANT SELECT ON public.published_conversation_summaries TO authenticated;