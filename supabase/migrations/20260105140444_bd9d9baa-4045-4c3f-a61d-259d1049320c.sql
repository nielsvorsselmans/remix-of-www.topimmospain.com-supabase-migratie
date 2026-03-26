-- Add summary_full column for detailed structured summaries
ALTER TABLE public.ghl_contact_appointments 
ADD COLUMN IF NOT EXISTS summary_full TEXT;