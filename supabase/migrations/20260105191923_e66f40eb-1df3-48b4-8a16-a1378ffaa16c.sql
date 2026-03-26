-- Add images array column to projects table for storing multiple photo URLs
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;