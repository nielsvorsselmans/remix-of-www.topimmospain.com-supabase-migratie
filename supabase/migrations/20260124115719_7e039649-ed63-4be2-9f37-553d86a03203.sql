-- Backfill source_template_id for existing selections that match templates
-- This links selections to their template based on title+room matching within the same project
UPDATE material_selections ms
SET source_template_id = (
  SELECT mt.id 
  FROM material_templates mt
  JOIN sales s ON s.id = ms.sale_id
  WHERE mt.project_id = s.project_id
    AND mt.title = ms.title
    AND COALESCE(mt.room, '') = COALESCE(ms.room, '')
  LIMIT 1
)
WHERE ms.source_template_id IS NULL;