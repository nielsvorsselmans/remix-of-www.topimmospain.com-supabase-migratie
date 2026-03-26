-- Add story_content field to reviews table for full story text
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS story_content TEXT;

-- Add any other potential story fields
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS full_story TEXT;