-- Add filter tracking and view timestamps to user_preferences
ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS last_used_cities TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS last_used_property_types TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS last_price_range_min NUMERIC,
ADD COLUMN IF NOT EXISTS last_price_range_max NUMERIC,
ADD COLUMN IF NOT EXISTS last_bedrooms_filter INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN IF NOT EXISTS last_search_queries TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS filter_update_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS view_timestamps JSONB DEFAULT '{}'::JSONB;