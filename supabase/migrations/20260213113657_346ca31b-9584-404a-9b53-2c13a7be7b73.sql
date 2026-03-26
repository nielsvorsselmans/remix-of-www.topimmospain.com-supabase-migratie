-- Add enrichment_status column for race condition protection
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS enrichment_status text NOT NULL DEFAULT 'idle';

-- Add index for quick status lookups
CREATE INDEX IF NOT EXISTS idx_projects_enrichment_status ON public.projects(enrichment_status);