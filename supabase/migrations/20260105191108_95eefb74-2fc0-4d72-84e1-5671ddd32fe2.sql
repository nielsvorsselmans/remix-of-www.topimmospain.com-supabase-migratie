-- Add is_resale column to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_resale BOOLEAN DEFAULT false;

-- Mark existing manual projects as resale
UPDATE projects SET is_resale = true WHERE source = 'manual';

-- Fix the invalid longitude and missing bedroom data for Velapi I
UPDATE projects 
SET longitude = -0.847164, 
    min_bedrooms = COALESCE(min_bedrooms, 2),
    max_bedrooms = COALESCE(max_bedrooms, 2)
WHERE name = 'Velapi I';