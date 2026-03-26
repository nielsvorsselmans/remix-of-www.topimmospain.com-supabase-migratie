-- Add min_bedrooms and max_bedrooms columns to projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS min_bedrooms INTEGER;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS max_bedrooms INTEGER;