-- Add partner attribution columns to customer_profiles
ALTER TABLE customer_profiles 
ADD COLUMN IF NOT EXISTS referred_by_partner_id UUID REFERENCES partners(id),
ADD COLUMN IF NOT EXISTS first_touch_partner_at TIMESTAMPTZ;

-- Add partner_id to tracking_events for per-pageview partner tracking
ALTER TABLE tracking_events 
ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES partners(id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_customer_profiles_partner ON customer_profiles(referred_by_partner_id);
CREATE INDEX IF NOT EXISTS idx_tracking_events_partner ON tracking_events(partner_id);

COMMENT ON COLUMN customer_profiles.referred_by_partner_id IS 'First-touch partner attribution (permanent)';
COMMENT ON COLUMN customer_profiles.first_touch_partner_at IS 'Timestamp when first referred by partner';
COMMENT ON COLUMN tracking_events.partner_id IS 'Partner active during this specific pageview';