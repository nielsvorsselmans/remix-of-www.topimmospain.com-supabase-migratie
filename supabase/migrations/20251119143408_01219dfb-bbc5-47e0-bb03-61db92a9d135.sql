-- Add first_name and last_name columns to orientation_requests table
ALTER TABLE public.orientation_requests 
ADD COLUMN first_name TEXT,
ADD COLUMN last_name TEXT;

-- Update existing records to split name into first_name and last_name
UPDATE public.orientation_requests 
SET 
  first_name = SPLIT_PART(name, ' ', 1),
  last_name = SUBSTRING(name FROM POSITION(' ' IN name) + 1)
WHERE name IS NOT NULL AND name != '';

-- Set constraints after data migration
ALTER TABLE public.orientation_requests
ALTER COLUMN first_name SET NOT NULL,
ALTER COLUMN last_name SET NOT NULL;

-- Add check constraints for length
ALTER TABLE public.orientation_requests
ADD CONSTRAINT first_name_length CHECK (LENGTH(first_name) >= 1 AND LENGTH(first_name) <= 100),
ADD CONSTRAINT last_name_length CHECK (LENGTH(last_name) >= 1 AND LENGTH(last_name) <= 100);