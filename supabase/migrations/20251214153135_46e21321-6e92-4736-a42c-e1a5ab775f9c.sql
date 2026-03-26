-- Add marked_as_sold tracking columns to sync_logs table
ALTER TABLE public.sync_logs 
ADD COLUMN IF NOT EXISTS marked_as_sold integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS projects_marked_sold integer DEFAULT 0;