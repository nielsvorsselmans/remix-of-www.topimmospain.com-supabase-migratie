
-- Fix the trigger with CORRECT template_key mappings
CREATE OR REPLACE FUNCTION public.auto_complete_milestone_on_document()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_template_key TEXT;
BEGIN
  -- Map document_type to template_key using CORRECT database values
  v_template_key := CASE NEW.document_type
    WHEN 'reservation_contract' THEN 'res_contract_upload'
    WHEN 'floor_plan' THEN 'koop_grondplan'
    WHEN 'specifications' THEN 'koop_specificaties'
    WHEN 'building_permit' THEN 'koop_bouwvergunning'
    WHEN 'cadastral_file' THEN 'koop_kadastraal'
    WHEN 'ownership_extract' THEN 'koop_eigendomsregister'
    WHEN 'bank_guarantee' THEN 'koop_bankgarantie'
    WHEN 'purchase_contract' THEN 'koop_contract'
    WHEN 'electrical_plan' THEN 'voorb_elektriciteit'
    WHEN 'measurement_plan' THEN 'voorb_afmetingen'
    ELSE NULL
  END;

  IF v_template_key IS NOT NULL THEN
    UPDATE public.sale_milestones
    SET completed_at = COALESCE(completed_at, NOW()), updated_at = NOW()
    WHERE sale_id = NEW.sale_id
      AND template_key = v_template_key
      AND completed_at IS NULL;
  END IF;

  RETURN NEW;
END;
$function$;

-- Fix the 4 milestones that had wrong template_key mappings
UPDATE sale_milestones sm
SET completed_at = COALESCE(sm.completed_at, NOW()), updated_at = NOW()
WHERE sm.template_key = 'koop_kadastraal'
  AND sm.completed_at IS NULL
  AND EXISTS (SELECT 1 FROM sale_documents WHERE sale_id = sm.sale_id AND document_type = 'cadastral_file');

UPDATE sale_milestones sm
SET completed_at = COALESCE(sm.completed_at, NOW()), updated_at = NOW()
WHERE sm.template_key = 'koop_contract'
  AND sm.completed_at IS NULL
  AND EXISTS (SELECT 1 FROM sale_documents WHERE sale_id = sm.sale_id AND document_type = 'purchase_contract');

UPDATE sale_milestones sm
SET completed_at = COALESCE(sm.completed_at, NOW()), updated_at = NOW()
WHERE sm.template_key = 'voorb_elektriciteit'
  AND sm.completed_at IS NULL
  AND EXISTS (SELECT 1 FROM sale_documents WHERE sale_id = sm.sale_id AND document_type = 'electrical_plan');

UPDATE sale_milestones sm
SET completed_at = COALESCE(sm.completed_at, NOW()), updated_at = NOW()
WHERE sm.template_key = 'voorb_afmetingen'
  AND sm.completed_at IS NULL
  AND EXISTS (SELECT 1 FROM sale_documents WHERE sale_id = sm.sale_id AND document_type = 'measurement_plan');

-- Trigger status recalculation for all sales
UPDATE sale_milestones
SET updated_at = NOW()
WHERE id IN (
  SELECT DISTINCT ON (sale_id) id 
  FROM sale_milestones 
  ORDER BY sale_id, created_at
);
