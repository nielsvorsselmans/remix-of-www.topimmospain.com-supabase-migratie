-- Add editor_notes column to content_items table for Senior Editor notes
ALTER TABLE public.content_items 
ADD COLUMN IF NOT EXISTS editor_notes text;