-- Drop old composite unique constraint if it exists
ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_api_source_api_id_key;

-- Add unique constraint on api_id only
-- This allows the same property from different sources to be recognized as the same property
ALTER TABLE properties ADD CONSTRAINT properties_api_id_key UNIQUE (api_id);