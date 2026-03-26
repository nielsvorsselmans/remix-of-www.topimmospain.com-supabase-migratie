-- Eenmalige herstel: kopieer afbeeldingen van Best Mediterraneo naar Martijn van Schaveren
INSERT INTO material_option_images (option_id, image_url, is_primary)
SELECT 
  target_opt.id as option_id,
  source_img.image_url,
  source_img.is_primary
FROM material_option_images source_img
-- Join naar source option
JOIN material_options source_opt ON source_opt.id = source_img.option_id
-- Join naar source selection
JOIN material_selections source_sel ON source_sel.id = source_opt.selection_id
-- Match met target selection op title en room
JOIN material_selections target_sel ON target_sel.title = source_sel.title 
  AND target_sel.room = source_sel.room
  AND target_sel.sale_id = '2aed5cf0-20a5-48c4-a526-8446615cfc7b'
-- Match met target option op name
JOIN material_options target_opt ON target_opt.selection_id = target_sel.id
  AND target_opt.name = source_opt.name
WHERE source_sel.sale_id = '9062eaf5-ee7f-460b-b8f3-cd8cae535fd0';