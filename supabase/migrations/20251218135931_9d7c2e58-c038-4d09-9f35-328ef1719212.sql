-- Fix de signature trigger functie om correcte document_type waarden te gebruiken
CREATE OR REPLACE FUNCTION public.auto_complete_milestone_on_signature()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if customer signed
  IF NEW.signed_by_customer_at IS NOT NULL AND (OLD.signed_by_customer_at IS NULL OR OLD IS NULL) THEN
    IF NEW.document_type = 'reservation_contract' THEN
      UPDATE public.sale_milestones
      SET completed_at = COALESCE(completed_at, NOW()), updated_at = NOW()
      WHERE sale_id = NEW.sale_id
        AND template_key = 'res_klant_ondertekend'
        AND completed_at IS NULL;
    ELSIF NEW.document_type = 'purchase_contract' THEN
      UPDATE public.sale_milestones
      SET completed_at = COALESCE(completed_at, NOW()), updated_at = NOW()
      WHERE sale_id = NEW.sale_id
        AND template_key = 'koop_klant_ondertekend'
        AND completed_at IS NULL;
    END IF;
  END IF;

  -- Check if developer signed
  IF NEW.signed_by_developer_at IS NOT NULL AND (OLD.signed_by_developer_at IS NULL OR OLD IS NULL) THEN
    IF NEW.document_type = 'reservation_contract' THEN
      UPDATE public.sale_milestones
      SET completed_at = COALESCE(completed_at, NOW()), updated_at = NOW()
      WHERE sale_id = NEW.sale_id
        AND template_key = 'res_developer_ondertekend'
        AND completed_at IS NULL;
    ELSIF NEW.document_type = 'purchase_contract' THEN
      UPDATE public.sale_milestones
      SET completed_at = COALESCE(completed_at, NOW()), updated_at = NOW()
      WHERE sale_id = NEW.sale_id
        AND template_key = 'koop_developer_ondertekend'
        AND completed_at IS NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Functie om res_extras te markeren als compleet wanneer er decisions zijn
CREATE OR REPLACE FUNCTION public.auto_complete_extras_milestone()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_has_decisions BOOLEAN;
BEGIN
  -- Check if any category has a decision (is_included, gifted_by_tis, or chosen_option_id)
  SELECT EXISTS (
    SELECT 1 FROM sale_extra_categories
    WHERE sale_id = NEW.sale_id
    AND (is_included = true OR gifted_by_tis = true OR chosen_option_id IS NOT NULL)
  ) INTO v_has_decisions;
  
  IF v_has_decisions THEN
    UPDATE public.sale_milestones
    SET completed_at = COALESCE(completed_at, NOW()), updated_at = NOW()
    WHERE sale_id = NEW.sale_id
      AND template_key = 'res_extras'
      AND completed_at IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS trigger_auto_complete_extras ON public.sale_extra_categories;
CREATE TRIGGER trigger_auto_complete_extras
AFTER INSERT OR UPDATE ON public.sale_extra_categories
FOR EACH ROW
EXECUTE FUNCTION public.auto_complete_extras_milestone();

-- Fix bestaande data: koop_klant_ondertekend voor alle signed purchase contracts
UPDATE sale_milestones sm
SET completed_at = sd.signed_by_customer_at, updated_at = NOW()
FROM sale_documents sd
WHERE sm.sale_id = sd.sale_id
  AND sd.document_type = 'purchase_contract'
  AND sd.signed_by_customer_at IS NOT NULL
  AND sm.template_key = 'koop_klant_ondertekend'
  AND sm.completed_at IS NULL;

-- Fix bestaande data: koop_developer_ondertekend voor alle signed purchase contracts
UPDATE sale_milestones sm
SET completed_at = sd.signed_by_developer_at, updated_at = NOW()
FROM sale_documents sd
WHERE sm.sale_id = sd.sale_id
  AND sd.document_type = 'purchase_contract'
  AND sd.signed_by_developer_at IS NOT NULL
  AND sm.template_key = 'koop_developer_ondertekend'
  AND sm.completed_at IS NULL;

-- Fix bestaande data: res_extras voor alle sales met extras decisions
UPDATE sale_milestones sm
SET completed_at = NOW(), updated_at = NOW()
FROM (
  SELECT DISTINCT sale_id
  FROM sale_extra_categories
  WHERE is_included = true OR gifted_by_tis = true OR chosen_option_id IS NOT NULL
) sec
WHERE sm.sale_id = sec.sale_id
  AND sm.template_key = 'res_extras'
  AND sm.completed_at IS NULL;