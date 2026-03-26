-- Add archetype column to content_items table
ALTER TABLE public.content_items 
ADD COLUMN archetype text;

-- Set default for existing records
UPDATE public.content_items SET archetype = 'authority' WHERE archetype IS NULL;