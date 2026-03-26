-- Add orientation_progress tracking to customer_profiles
ALTER TABLE public.customer_profiles 
ADD COLUMN IF NOT EXISTS orientation_progress jsonb DEFAULT '{}';

-- Add a comment for documentation
COMMENT ON COLUMN public.customer_profiles.orientation_progress IS 'Tracks orientation activities: guides_viewed, calculator_used, projects_viewed_count, meeting_scheduled, checklist_progress';