-- Add engagement_data JSONB column to user_preferences for tracking detailed user behavior
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS engagement_data jsonb DEFAULT '{}'::jsonb;

-- Add engagement_data JSONB column to visitor_preferences for anonymous users
ALTER TABLE visitor_preferences 
ADD COLUMN IF NOT EXISTS engagement_data jsonb DEFAULT '{}'::jsonb;

-- Add index for faster queries on engagement data
CREATE INDEX IF NOT EXISTS idx_user_preferences_engagement 
ON user_preferences USING gin (engagement_data);

CREATE INDEX IF NOT EXISTS idx_visitor_preferences_engagement 
ON visitor_preferences USING gin (engagement_data);

COMMENT ON COLUMN user_preferences.engagement_data IS 'Tracks user engagement: tab time, accordion opens, scroll depth, return visits';
COMMENT ON COLUMN visitor_preferences.engagement_data IS 'Tracks anonymous visitor engagement: tab time, accordion opens, scroll depth, return visits';