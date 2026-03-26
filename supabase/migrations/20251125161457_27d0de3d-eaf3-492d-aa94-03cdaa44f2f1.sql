-- Uitbreiding city_info_cache tabel voor rijkere gemeente pagina's
ALTER TABLE city_info_cache ADD COLUMN IF NOT EXISTS highlights JSONB DEFAULT '[]';
ALTER TABLE city_info_cache ADD COLUMN IF NOT EXISTS investment_info TEXT;
ALTER TABLE city_info_cache ADD COLUMN IF NOT EXISTS distance_to_beach_km INTEGER;
ALTER TABLE city_info_cache ADD COLUMN IF NOT EXISTS distance_to_airport_km INTEGER;
ALTER TABLE city_info_cache ADD COLUMN IF NOT EXISTS featured_image TEXT;
ALTER TABLE city_info_cache ADD COLUMN IF NOT EXISTS slug TEXT;

-- Maak index op slug voor snellere lookups
CREATE INDEX IF NOT EXISTS idx_city_info_cache_slug ON city_info_cache(slug);