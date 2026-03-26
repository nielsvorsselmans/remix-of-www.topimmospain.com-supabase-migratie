ALTER TABLE public.ghl_contact_appointments 
ADD COLUMN IF NOT EXISTS granola_meeting_id TEXT,
ADD COLUMN IF NOT EXISTS transcript TEXT;