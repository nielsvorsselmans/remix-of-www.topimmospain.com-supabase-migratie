-- Create user_preferences table for storing user investment preferences
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Basis investeerder profiel
  budget_min numeric,
  budget_max numeric,
  preferred_regions text[] DEFAULT ARRAY[]::text[],
  property_types text[] DEFAULT ARRAY[]::text[],
  
  -- Investerings voorkeuren
  investment_goal text, -- 'rental_income' | 'capital_growth' | 'both' | 'personal_use' | 'combination'
  experience_level text, -- 'beginner' | 'intermediate' | 'experienced'
  timeline text, -- 'immediate' | '3_months' | '6_months' | '1_year'
  
  -- Specifieke wensen
  min_bedrooms integer,
  max_bedrooms integer,
  requires_parking boolean DEFAULT false,
  requires_pool boolean DEFAULT false,
  distance_to_beach_max_m integer,
  
  -- Engagement tracking
  favorite_project_ids uuid[] DEFAULT ARRAY[]::uuid[],
  viewed_project_ids uuid[] DEFAULT ARRAY[]::uuid[],
  project_opinions jsonb DEFAULT '{}'::jsonb,
  
  -- Call booking tracking
  call_interest text, -- 'interested' | 'not_now' | 'declined'
  call_declination_reason text,
  phone_number text,
  preferred_call_times text[] DEFAULT ARRAY[]::text[],
  
  -- Metadata
  last_budget_update timestamp with time zone,
  last_region_update timestamp with time zone,
  data_completeness_score integer DEFAULT 0 CHECK (data_completeness_score >= 0 AND data_completeness_score <= 100),
  
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  
  -- Ensure one preference record per user
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own preferences"
  ON public.user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON public.user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON public.user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all preferences"
  ON public.user_preferences FOR ALL
  USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Indexes for performance
CREATE INDEX idx_user_preferences_user_id ON public.user_preferences(user_id);
CREATE INDEX idx_user_preferences_regions ON public.user_preferences USING GIN(preferred_regions);
CREATE INDEX idx_user_preferences_budget ON public.user_preferences(budget_min, budget_max);
CREATE INDEX idx_user_preferences_completeness ON public.user_preferences(data_completeness_score);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.user_preferences TO authenticated;
GRANT ALL ON public.user_preferences TO service_role;