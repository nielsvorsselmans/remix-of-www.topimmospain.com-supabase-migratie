-- Add preferences_source column to track who filled in each preference field
ALTER TABLE public.customer_profiles 
ADD COLUMN IF NOT EXISTS preferences_source jsonb DEFAULT '{}'::jsonb;

-- Add onboarding_completed_at to track when customer finished onboarding
ALTER TABLE public.customer_profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

-- Add comment for documentation
COMMENT ON COLUMN public.customer_profiles.preferences_source IS 'Tracks source of each preference field: admin or customer';
COMMENT ON COLUMN public.customer_profiles.onboarding_completed_at IS 'Timestamp when customer completed the onboarding questionnaire';