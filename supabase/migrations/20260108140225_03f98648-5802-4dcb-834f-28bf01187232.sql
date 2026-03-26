-- Add merged_at column to crm_leads for tracking merge operations
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS merged_at TIMESTAMPTZ;