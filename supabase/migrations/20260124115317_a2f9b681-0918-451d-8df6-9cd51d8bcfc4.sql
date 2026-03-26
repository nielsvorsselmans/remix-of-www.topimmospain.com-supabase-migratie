-- Add source_template_id to track which template a selection came from
ALTER TABLE material_selections 
ADD COLUMN source_template_id uuid REFERENCES material_templates(id) ON DELETE SET NULL;

-- Index for fast lookups when checking duplicates
CREATE INDEX idx_material_selections_source_template 
ON material_selections(source_template_id) 
WHERE source_template_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN material_selections.source_template_id IS 'References the template this selection was created from, used for duplicate detection when applying templates';