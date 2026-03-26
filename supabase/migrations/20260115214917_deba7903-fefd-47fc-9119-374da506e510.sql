-- Add archived column to insights table for soft delete
ALTER TABLE public.insights 
ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone;

-- Create index for faster sorting on created_at
CREATE INDEX IF NOT EXISTS idx_insights_created_at ON public.insights(created_at DESC);

-- Create index for archived filter
CREATE INDEX IF NOT EXISTS idx_insights_archived ON public.insights(archived) WHERE archived = false;