-- Add investment_goal, timeline, and qualification tracking to visitor_preferences
ALTER TABLE visitor_preferences 
ADD COLUMN IF NOT EXISTS investment_goal text,
ADD COLUMN IF NOT EXISTS timeline text,
ADD COLUMN IF NOT EXISTS data_completeness_score integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS budget_min numeric,
ADD COLUMN IF NOT EXISTS budget_max numeric,
ADD COLUMN IF NOT EXISTS preferred_regions text[];