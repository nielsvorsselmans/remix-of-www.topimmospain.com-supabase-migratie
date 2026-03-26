
-- Fix the auto_complete_milestone_on_document trigger to use correct English document_type names
CREATE OR REPLACE FUNCTION public.auto_complete_milestone_on_document()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_template_key TEXT;
BEGIN
  -- Map document_type to template key using the ACTUAL English document types stored in the database
  v_template_key := CASE NEW.document_type
    WHEN 'reservation_contract' THEN 'res_contract_upload'
    WHEN 'floor_plan' THEN 'koop_grondplan'
    WHEN 'specifications' THEN 'koop_specificaties'
    WHEN 'building_permit' THEN 'koop_bouwvergunning'
    WHEN 'cadastral_file' THEN 'koop_kadastrale_fiche'
    WHEN 'ownership_extract' THEN 'koop_eigendomsregister'
    WHEN 'bank_guarantee' THEN 'koop_bankgarantie'
    WHEN 'purchase_contract' THEN 'koop_koopovereenkomst'
    WHEN 'electrical_plan' THEN 'voorb_elektriciteitsplan'
    WHEN 'measurement_plan' THEN 'voorb_afmetingenplan'
    ELSE NULL
  END;

  -- If we have a matching template key, update it
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

-- One-time data fix: Update all existing milestones where documents exist but completed_at is NULL

-- Fix floor_plan documents
UPDATE sale_milestones sm
SET completed_at = COALESCE(sm.completed_at, NOW()), updated_at = NOW()
WHERE sm.template_key = 'koop_grondplan'
  AND sm.completed_at IS NULL
  AND EXISTS (SELECT 1 FROM sale_documents WHERE sale_id = sm.sale_id AND document_type = 'floor_plan');

-- Fix specifications documents
UPDATE sale_milestones sm
SET completed_at = COALESCE(sm.completed_at, NOW()), updated_at = NOW()
WHERE sm.template_key = 'koop_specificaties'
  AND sm.completed_at IS NULL
  AND EXISTS (SELECT 1 FROM sale_documents WHERE sale_id = sm.sale_id AND document_type = 'specifications');

-- Fix building_permit documents
UPDATE sale_milestones sm
SET completed_at = COALESCE(sm.completed_at, NOW()), updated_at = NOW()
WHERE sm.template_key = 'koop_bouwvergunning'
  AND sm.completed_at IS NULL
  AND EXISTS (SELECT 1 FROM sale_documents WHERE sale_id = sm.sale_id AND document_type = 'building_permit');

-- Fix cadastral_file documents
UPDATE sale_milestones sm
SET completed_at = COALESCE(sm.completed_at, NOW()), updated_at = NOW()
WHERE sm.template_key = 'koop_kadastrale_fiche'
  AND sm.completed_at IS NULL
  AND EXISTS (SELECT 1 FROM sale_documents WHERE sale_id = sm.sale_id AND document_type = 'cadastral_file');

-- Fix ownership_extract documents
UPDATE sale_milestones sm
SET completed_at = COALESCE(sm.completed_at, NOW()), updated_at = NOW()
WHERE sm.template_key = 'koop_eigendomsregister'
  AND sm.completed_at IS NULL
  AND EXISTS (SELECT 1 FROM sale_documents WHERE sale_id = sm.sale_id AND document_type = 'ownership_extract');

-- Fix bank_guarantee documents
UPDATE sale_milestones sm
SET completed_at = COALESCE(sm.completed_at, NOW()), updated_at = NOW()
WHERE sm.template_key = 'koop_bankgarantie'
  AND sm.completed_at IS NULL
  AND EXISTS (SELECT 1 FROM sale_documents WHERE sale_id = sm.sale_id AND document_type = 'bank_guarantee');

-- Fix purchase_contract documents
UPDATE sale_milestones sm
SET completed_at = COALESCE(sm.completed_at, NOW()), updated_at = NOW()
WHERE sm.template_key = 'koop_koopovereenkomst'
  AND sm.completed_at IS NULL
  AND EXISTS (SELECT 1 FROM sale_documents WHERE sale_id = sm.sale_id AND document_type = 'purchase_contract');

-- Fix reservation_contract documents
UPDATE sale_milestones sm
SET completed_at = COALESCE(sm.completed_at, NOW()), updated_at = NOW()
WHERE sm.template_key = 'res_contract_upload'
  AND sm.completed_at IS NULL
  AND EXISTS (SELECT 1 FROM sale_documents WHERE sale_id = sm.sale_id AND document_type = 'reservation_contract');

-- Fix electrical_plan documents
UPDATE sale_milestones sm
SET completed_at = COALESCE(sm.completed_at, NOW()), updated_at = NOW()
WHERE sm.template_key = 'voorb_elektriciteitsplan'
  AND sm.completed_at IS NULL
  AND EXISTS (SELECT 1 FROM sale_documents WHERE sale_id = sm.sale_id AND document_type = 'electrical_plan');

-- Fix measurement_plan documents
UPDATE sale_milestones sm
SET completed_at = COALESCE(sm.completed_at, NOW()), updated_at = NOW()
WHERE sm.template_key = 'voorb_afmetingenplan'
  AND sm.completed_at IS NULL
  AND EXISTS (SELECT 1 FROM sale_documents WHERE sale_id = sm.sale_id AND document_type = 'measurement_plan');

-- Recalculate all sale statuses by touching each sale's milestones to trigger the status update
-- This is done by updating the updated_at timestamp on any milestone, which triggers the status recalculation
UPDATE sale_milestones
SET updated_at = NOW()
WHERE id IN (
  SELECT DISTINCT ON (sale_id) id 
  FROM sale_milestones 
  ORDER BY sale_id, created_at
);
