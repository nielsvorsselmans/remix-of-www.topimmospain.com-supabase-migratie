-- Add new columns to sale_extra_options for rich option comparison
ALTER TABLE sale_extra_options ADD COLUMN IF NOT EXISTS highlights jsonb DEFAULT '[]';
ALTER TABLE sale_extra_options ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE sale_extra_options ADD COLUMN IF NOT EXISTS is_recommended boolean DEFAULT false;
ALTER TABLE sale_extra_options ADD COLUMN IF NOT EXISTS detailed_specs text;