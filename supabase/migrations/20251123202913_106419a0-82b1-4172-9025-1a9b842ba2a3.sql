-- Add development_id field for external project/development references
ALTER TABLE properties ADD COLUMN IF NOT EXISTS development_id text;