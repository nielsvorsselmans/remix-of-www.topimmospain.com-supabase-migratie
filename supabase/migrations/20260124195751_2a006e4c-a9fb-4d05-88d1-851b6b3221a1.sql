-- Add AI rewritten description columns to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS ai_rewritten_description JSONB DEFAULT NULL;

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS ai_rewritten_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN projects.ai_rewritten_description IS 
'AI-herschreven beschrijving met forWhom, notForWhom, keyFacts en description velden';

COMMENT ON COLUMN projects.ai_rewritten_at IS 
'Timestamp van laatste AI herschrijving voor cache invalidatie';