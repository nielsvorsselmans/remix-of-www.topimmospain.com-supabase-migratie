-- Add location intelligence caching columns to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS location_intelligence JSONB DEFAULT NULL;

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS location_intelligence_updated_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN projects.location_intelligence IS 
'Cached Google Places data met nabijgelegen voorzieningen (stranden, golfbanen, supermarkten, etc.)';

COMMENT ON COLUMN projects.location_intelligence_updated_at IS 
'Timestamp van laatste locatie-data update voor cache invalidatie';