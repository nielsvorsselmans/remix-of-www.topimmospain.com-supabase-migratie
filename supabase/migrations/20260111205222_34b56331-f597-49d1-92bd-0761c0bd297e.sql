-- Add QA columns to content_items table
ALTER TABLE content_items 
ADD COLUMN IF NOT EXISTS strategy_data JSONB,
ADD COLUMN IF NOT EXISTS draft_data JSONB,
ADD COLUMN IF NOT EXISTS qa_report JSONB;

-- Add comment for documentation
COMMENT ON COLUMN content_items.strategy_data IS 'Output van de Strateeg: angle, archetype, briefing';
COMMENT ON COLUMN content_items.draft_data IS 'Output van de Junior Writer: ruwe tekst';
COMMENT ON COLUMN content_items.qa_report IS 'QA analyse resultaten: scores en feedback';