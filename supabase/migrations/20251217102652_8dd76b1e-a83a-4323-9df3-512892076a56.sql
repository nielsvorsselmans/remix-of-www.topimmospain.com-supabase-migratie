-- Add index on costa column for faster filtering
CREATE INDEX IF NOT EXISTS idx_properties_costa ON public.properties(costa);

-- Add composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_properties_project_costa ON public.properties(project_id, costa);

-- Add index on properties status for availability filtering
CREATE INDEX IF NOT EXISTS idx_properties_status ON public.properties(status);