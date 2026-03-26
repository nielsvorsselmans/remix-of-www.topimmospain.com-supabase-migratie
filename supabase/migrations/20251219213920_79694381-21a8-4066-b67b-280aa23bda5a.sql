-- Add dropped_off columns to crm_leads
ALTER TABLE public.crm_leads
ADD COLUMN IF NOT EXISTS dropped_off_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS dropped_off_phase TEXT,
ADD COLUMN IF NOT EXISTS dropped_off_reason TEXT,
ADD COLUMN IF NOT EXISTS dropped_off_notes TEXT,
ADD COLUMN IF NOT EXISTS recontact_allowed BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS recontact_after DATE;

-- Add comment for documentation
COMMENT ON COLUMN public.crm_leads.dropped_off_at IS 'Timestamp when lead dropped off from the process';
COMMENT ON COLUMN public.crm_leads.dropped_off_phase IS 'Journey phase when lead dropped off';
COMMENT ON COLUMN public.crm_leads.dropped_off_reason IS 'Reason for dropping off: budget, timing, region, property_type, personal, competitor, no_interest, other';
COMMENT ON COLUMN public.crm_leads.dropped_off_notes IS 'Additional notes about why lead dropped off';
COMMENT ON COLUMN public.crm_leads.recontact_allowed IS 'Whether lead may be recontacted in the future';
COMMENT ON COLUMN public.crm_leads.recontact_after IS 'Date after which lead may be recontacted';