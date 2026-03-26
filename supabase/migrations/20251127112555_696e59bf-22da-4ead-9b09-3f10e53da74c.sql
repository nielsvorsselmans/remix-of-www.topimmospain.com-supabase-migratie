-- Add hero image and brand color fields to partners table
ALTER TABLE partners 
ADD COLUMN hero_image_url text,
ADD COLUMN brand_color text;

COMMENT ON COLUMN partners.hero_image_url IS 'URL to hero/banner image from partner website';
COMMENT ON COLUMN partners.brand_color IS 'Primary brand color in hex format (e.g., #3B82F6)';