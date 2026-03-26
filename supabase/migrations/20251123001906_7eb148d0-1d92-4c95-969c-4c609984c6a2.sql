-- Create table for caching rental comparables data
CREATE TABLE IF NOT EXISTS rental_comparables_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  bedrooms INTEGER NOT NULL,
  bathrooms DOUBLE PRECISION NOT NULL,
  guests INTEGER NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  CONSTRAINT unique_property_params UNIQUE (project_id, bedrooms, bathrooms, guests)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_rental_cache_project_expires 
ON rental_comparables_cache(project_id, expires_at);

CREATE INDEX IF NOT EXISTS idx_rental_cache_expires 
ON rental_comparables_cache(expires_at);

-- Enable RLS
ALTER TABLE rental_comparables_cache ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read cached data (it's public market data)
CREATE POLICY "Anyone can view rental comparables cache" 
ON rental_comparables_cache 
FOR SELECT 
USING (true);

-- Only service role can insert/update cache
CREATE POLICY "Service role can manage cache" 
ON rental_comparables_cache 
FOR ALL 
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Add comment
COMMENT ON TABLE rental_comparables_cache IS 'Caches AirROI rental comparables data for 30 days to reduce API calls and costs';