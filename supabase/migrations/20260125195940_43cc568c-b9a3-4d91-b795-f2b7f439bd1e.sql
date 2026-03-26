-- Add extra columns to travel_guide_pois for Google Places data
ALTER TABLE travel_guide_pois
ADD COLUMN IF NOT EXISTS rating DECIMAL(2,1),
ADD COLUMN IF NOT EXISTS rating_count INTEGER,
ADD COLUMN IF NOT EXISTS price_level TEXT;

-- Add google_type to categories for API mapping
ALTER TABLE travel_guide_categories
ADD COLUMN IF NOT EXISTS google_type TEXT;

-- Update categories with Google Places types
UPDATE travel_guide_categories SET google_type = 'beach' WHERE name = 'Stranden';
UPDATE travel_guide_categories SET google_type = 'golf_course' WHERE name = 'Golfterreinen';
UPDATE travel_guide_categories SET google_type = 'restaurant' WHERE name = 'Restaurants & Bars';
UPDATE travel_guide_categories SET google_type = 'market' WHERE name = 'Wekelijkse Markten';
UPDATE travel_guide_categories SET google_type = 'shopping_mall' WHERE name = 'Winkelcentra';
UPDATE travel_guide_categories SET google_type = 'supermarket' WHERE name = 'Supermarkten';
UPDATE travel_guide_categories SET google_type = 'hospital' WHERE name = 'Ziekenhuizen & Klinieken';
UPDATE travel_guide_categories SET google_type = 'marina' WHERE name = 'Marinas & Jachthavens';
UPDATE travel_guide_categories SET google_type = 'tourist_attraction' WHERE name = 'Culturele Bezienswaardigheden';
UPDATE travel_guide_categories SET google_type = 'spa' WHERE name = 'Wellness & Spa';
UPDATE travel_guide_categories SET google_type = 'amusement_park' WHERE name = 'Pretparken & Attracties';
UPDATE travel_guide_categories SET google_type = 'park' WHERE name = 'Natuurparken';