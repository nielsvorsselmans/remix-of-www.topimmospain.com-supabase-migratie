-- Add pending_sold_at column for two-phase sold verification
-- Properties will first be marked as "pending sold" before being definitively marked as "sold"
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS pending_sold_at TIMESTAMP WITH TIME ZONE;

-- Add index for efficient querying of pending sold properties
CREATE INDEX IF NOT EXISTS idx_properties_pending_sold_at 
ON properties(pending_sold_at) 
WHERE pending_sold_at IS NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN properties.pending_sold_at IS 'Timestamp when property was first detected as missing from XML feed. After 24 hours, property will be marked as sold.';