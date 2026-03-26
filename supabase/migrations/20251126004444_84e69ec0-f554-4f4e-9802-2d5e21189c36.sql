-- Add reading milestone columns to blog_reading_analytics
ALTER TABLE blog_reading_analytics
ADD COLUMN IF NOT EXISTS milestone_25_reached BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS milestone_50_reached BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS milestone_75_reached BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS milestone_25_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS milestone_50_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS milestone_75_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN blog_reading_analytics.milestone_25_reached IS 'Whether user reached 25% scroll depth';
COMMENT ON COLUMN blog_reading_analytics.milestone_50_reached IS 'Whether user reached 50% scroll depth';
COMMENT ON COLUMN blog_reading_analytics.milestone_75_reached IS 'Whether user reached 75% scroll depth';
COMMENT ON COLUMN blog_reading_analytics.milestone_25_at IS 'Timestamp when 25% milestone was reached';
COMMENT ON COLUMN blog_reading_analytics.milestone_50_at IS 'Timestamp when 50% milestone was reached';
COMMENT ON COLUMN blog_reading_analytics.milestone_75_at IS 'Timestamp when 75% milestone was reached';
