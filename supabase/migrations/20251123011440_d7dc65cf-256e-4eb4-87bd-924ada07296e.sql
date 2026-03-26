-- Add comparables column to rental_comparables_cache table
ALTER TABLE rental_comparables_cache
ADD COLUMN comparables jsonb DEFAULT '[]'::jsonb;

-- Add index for better performance when querying comparables
CREATE INDEX idx_rental_comparables_cache_comparables ON rental_comparables_cache USING gin(comparables);