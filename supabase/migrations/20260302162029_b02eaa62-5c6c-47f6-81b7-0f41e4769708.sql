-- Add inspector tracking columns to snagging_items
ALTER TABLE public.snagging_items
ADD COLUMN checked_by text NULL,
ADD COLUMN checked_at timestamptz NULL;