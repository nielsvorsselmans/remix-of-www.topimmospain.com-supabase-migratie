-- Add unique constraint to prevent duplicate properties based on api_source and api_id
ALTER TABLE properties 
ADD CONSTRAINT unique_api_property 
UNIQUE (api_source, api_id);

-- Add index for faster lookups during sync
CREATE INDEX IF NOT EXISTS idx_properties_api_source_id 
ON properties(api_source, api_id);

-- Add new columns for extended property data

-- Cost fields
ALTER TABLE properties ADD COLUMN IF NOT EXISTS ibi_tax_yearly numeric;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS garbage_tax_yearly numeric;

-- Area fields
ALTER TABLE properties ADD COLUMN IF NOT EXISTS usable_area_sqm numeric;

-- Specification fields
ALTER TABLE properties ADD COLUMN IF NOT EXISTS toilets integer;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS floor text;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS total_floors integer;

-- Facilities (boolean fields)
ALTER TABLE properties ADD COLUMN IF NOT EXISTS pool boolean DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS garage boolean DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS elevator boolean DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS airconditioning boolean DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS heating boolean DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS fireplace boolean DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS alarm boolean DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS basement boolean DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS storage_room boolean DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS solarium boolean DEFAULT false;

-- Distance fields
ALTER TABLE properties ADD COLUMN IF NOT EXISTS distance_to_golf_m integer;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS distance_to_airport_km integer;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS distance_to_shops_m integer;

-- Multilingual descriptions
ALTER TABLE properties ADD COLUMN IF NOT EXISTS description_en text;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS description_es text;

-- Media fields
ALTER TABLE properties ADD COLUMN IF NOT EXISTS video_url text;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS virtual_tour_url text;

-- Status & metadata fields
ALTER TABLE properties ADD COLUMN IF NOT EXISTS new_build boolean DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS price_reduced boolean DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS featured boolean DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS availability_date date;