
CREATE OR REPLACE FUNCTION public.revert_milestone_on_document_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_template_key TEXT;
  v_remaining INT;
BEGIN
  v_template_key := CASE OLD.document_type
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
    WHEN 'notarial_deed' THEN 'overd_notariele_akte'
    WHEN 'epc_certificate' THEN 'overd_epc'
    WHEN 'habitability_certificate' THEN 'overd_bewoonbaarheid'
    ELSE NULL
  END;

  IF v_template_key IS NULL THEN
    RETURN OLD;
  END IF;

  SELECT COUNT(*) INTO v_remaining
  FROM public.sale_documents
  WHERE sale_id = OLD.sale_id
    AND document_type = OLD.document_type
    AND id != OLD.id;

  IF v_remaining = 0 THEN
    UPDATE public.sale_milestones
    SET completed_at = NULL, updated_at = NOW()
    WHERE sale_id = OLD.sale_id
      AND template_key = v_template_key
      AND completed_at IS NOT NULL;

    -- Signature milestones terugzetten bij contractverwijdering
    IF OLD.document_type = 'reservation_contract' THEN
      IF OLD.signed_by_customer_at IS NOT NULL THEN
        UPDATE public.sale_milestones SET completed_at = NULL, updated_at = NOW()
        WHERE sale_id = OLD.sale_id AND template_key = 'res_klant_ondertekend' AND completed_at IS NOT NULL;
      END IF;
      IF OLD.signed_by_developer_at IS NOT NULL THEN
        UPDATE public.sale_milestones SET completed_at = NULL, updated_at = NOW()
        WHERE sale_id = OLD.sale_id AND template_key = 'res_developer_ondertekend' AND completed_at IS NOT NULL;
      END IF;
    ELSIF OLD.document_type = 'purchase_contract' THEN
      IF OLD.signed_by_customer_at IS NOT NULL THEN
        UPDATE public.sale_milestones SET completed_at = NULL, updated_at = NOW()
        WHERE sale_id = OLD.sale_id AND template_key = 'koop_klant_ondertekend' AND completed_at IS NOT NULL;
      END IF;
      IF OLD.signed_by_developer_at IS NOT NULL THEN
        UPDATE public.sale_milestones SET completed_at = NULL, updated_at = NOW()
        WHERE sale_id = OLD.sale_id AND template_key = 'koop_developer_ondertekend' AND completed_at IS NOT NULL;
      END IF;
    END IF;
  END IF;

  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_revert_milestone_on_document_delete
AFTER DELETE ON public.sale_documents
FOR EACH ROW
EXECUTE FUNCTION public.revert_milestone_on_document_delete();
