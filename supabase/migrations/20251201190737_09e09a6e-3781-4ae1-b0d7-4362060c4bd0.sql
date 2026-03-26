-- Add last_ghl_refresh_at timestamp to track manual GHL syncs
ALTER TABLE crm_leads 
ADD COLUMN IF NOT EXISTS last_ghl_refresh_at TIMESTAMP WITH TIME ZONE;