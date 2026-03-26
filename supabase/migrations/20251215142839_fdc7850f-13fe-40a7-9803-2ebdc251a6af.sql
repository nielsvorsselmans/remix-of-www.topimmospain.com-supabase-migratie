-- Add source column to projects table
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS source text DEFAULT 'redsp';

-- Update existing projects to be marked as redsp (from sync)
UPDATE public.projects SET source = 'redsp' WHERE source IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.projects.source IS 'Source of project: redsp (from XML sync) or manual (manually created). Manual projects are protected from sync operations.';