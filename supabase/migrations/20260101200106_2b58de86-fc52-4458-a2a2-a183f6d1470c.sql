-- Add GHL sync columns to webinar_registrations
ALTER TABLE public.webinar_registrations
ADD COLUMN IF NOT EXISTS ghl_contact_id text,
ADD COLUMN IF NOT EXISTS ghl_appointment_id text,
ADD COLUMN IF NOT EXISTS ghl_synced_at timestamp with time zone;