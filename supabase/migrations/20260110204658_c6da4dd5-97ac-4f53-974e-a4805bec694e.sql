-- Add versioning columns to content_items
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES content_items(id) ON DELETE SET NULL;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS version integer DEFAULT 1;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS edit_type text DEFAULT 'original';

-- Create index for efficient version lookups
CREATE INDEX IF NOT EXISTS idx_content_items_parent_id ON content_items(parent_id);
CREATE INDEX IF NOT EXISTS idx_content_items_version ON content_items(version);

-- Add comment for documentation
COMMENT ON COLUMN content_items.parent_id IS 'Reference to original content item for versioned edits';
COMMENT ON COLUMN content_items.version IS 'Version number: 1 = original, 2+ = edited versions';
COMMENT ON COLUMN content_items.edit_type IS 'Type of edit: original, senior_editor, manual';