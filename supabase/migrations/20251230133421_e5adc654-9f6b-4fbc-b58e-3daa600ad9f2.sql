-- Add GHL sync columns to info_evening_registrations
ALTER TABLE public.info_evening_registrations 
ADD COLUMN IF NOT EXISTS ghl_contact_id TEXT,
ADD COLUMN IF NOT EXISTS ghl_synced_at TIMESTAMPTZ;

-- Add GHL dropdown value column to info_evening_events
ALTER TABLE public.info_evening_events
ADD COLUMN IF NOT EXISTS ghl_dropdown_value TEXT;

-- Update existing events with their GHL dropdown values
UPDATE public.info_evening_events SET ghl_dropdown_value = 'Woensdag 4 februari - Eindhoven' WHERE location_name = 'Eindhoven';
UPDATE public.info_evening_events SET ghl_dropdown_value = 'Donderdag 5 februari - Zuid-Holland' WHERE location_name = 'Zuid-Holland';
UPDATE public.info_evening_events SET ghl_dropdown_value = 'Vrijdag 6 februari - Utrecht' WHERE location_name = 'Utrecht';
UPDATE public.info_evening_events SET ghl_dropdown_value = 'Zaterdag 7 februari - Oost-Vlaanderen' WHERE location_name = 'Aalst';