-- Add showhouse location columns to projects table
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS showhouse_address TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS showhouse_latitude DOUBLE PRECISION;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS showhouse_longitude DOUBLE PRECISION;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS showhouse_maps_url TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS showhouse_notes TEXT;