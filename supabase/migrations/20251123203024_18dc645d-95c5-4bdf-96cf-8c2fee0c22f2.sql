-- Add missing fields based on actual XML structure
ALTER TABLE properties ADD COLUMN IF NOT EXISTS beds_single integer;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS beds_double integer;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS key_ready boolean DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS show_house boolean DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS off_plan boolean DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS delivery_date date;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS communal_pool boolean DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS private_pool boolean DEFAULT false;

-- View types
ALTER TABLE properties ADD COLUMN IF NOT EXISTS sea_views boolean DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS mountain_views boolean DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS garden_views boolean DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS pool_views boolean DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS open_views boolean DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS village_views boolean DEFAULT false;

-- Category types
ALTER TABLE properties ADD COLUMN IF NOT EXISTS category_urban boolean DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS category_beach boolean DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS category_golf boolean DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS category_countryside boolean DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS category_first_line boolean DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS category_tourist boolean DEFAULT false;