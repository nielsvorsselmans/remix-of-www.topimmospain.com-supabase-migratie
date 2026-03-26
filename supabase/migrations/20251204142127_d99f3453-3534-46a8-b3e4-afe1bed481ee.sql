-- Add time and airport fields to customer_viewing_trips
ALTER TABLE customer_viewing_trips 
ADD COLUMN IF NOT EXISTS arrival_time TIME,
ADD COLUMN IF NOT EXISTS departure_time TIME,
ADD COLUMN IF NOT EXISTS airport TEXT;

-- Create index for faster trip lookups
CREATE INDEX IF NOT EXISTS idx_customer_viewing_trips_crm_lead_id ON customer_viewing_trips(crm_lead_id);
CREATE INDEX IF NOT EXISTS idx_customer_viewing_trips_status ON customer_viewing_trips(status);