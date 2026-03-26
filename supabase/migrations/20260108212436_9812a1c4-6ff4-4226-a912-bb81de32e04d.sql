-- Add summary columns to manual_events table
ALTER TABLE manual_events 
ADD COLUMN IF NOT EXISTS is_summary_published boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS summary_headline text,
ADD COLUMN IF NOT EXISTS summary_short text,
ADD COLUMN IF NOT EXISTS summary_full text,
ADD COLUMN IF NOT EXISTS summary_category text,
ADD COLUMN IF NOT EXISTS client_pseudonym text,
ADD COLUMN IF NOT EXISTS key_topics text[];