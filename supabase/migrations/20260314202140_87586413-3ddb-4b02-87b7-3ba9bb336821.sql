ALTER TABLE public.lead_nurture_actions ADD COLUMN IF NOT EXISTS generated_message TEXT;
ALTER TABLE public.lead_nurture_actions ADD COLUMN IF NOT EXISTS generated_message_subject TEXT;