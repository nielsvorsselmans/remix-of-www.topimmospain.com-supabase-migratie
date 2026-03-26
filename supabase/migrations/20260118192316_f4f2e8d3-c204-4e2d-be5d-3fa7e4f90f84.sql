-- Eenmalige herstel (deel 2): kopieer ontbrekende afbeeldingen (NULL-safe room match)
INSERT INTO material_option_images (option_id, image_url, is_primary)
SELECT
  target_opt.id as option_id,
  source_img.image_url,
  source_img.is_primary
FROM material_option_images source_img
JOIN material_options source_opt
  ON source_opt.id = source_img.option_id
JOIN material_selections source_sel
  ON source_sel.id = source_opt.selection_id
JOIN material_selections target_sel
  ON target_sel.sale_id = '2aed5cf0-20a5-48c4-a526-8446615cfc7b'
 AND target_sel.title = source_sel.title
 AND target_sel.room IS NOT DISTINCT FROM source_sel.room
JOIN material_options target_opt
  ON target_opt.selection_id = target_sel.id
 AND target_opt.name = source_opt.name
WHERE source_sel.sale_id = '9062eaf5-ee7f-460b-b8f3-cd8cae535fd0'
  AND NOT EXISTS (
    SELECT 1
    FROM material_option_images existing
    WHERE existing.option_id = target_opt.id
      AND existing.image_url = source_img.image_url
  );