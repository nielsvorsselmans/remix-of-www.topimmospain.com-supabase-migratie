
-- Function to auto-complete milestone when reservation contract is uploaded
CREATE OR REPLACE FUNCTION public.auto_complete_milestone_on_document()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_milestone_key TEXT;
BEGIN
  -- Map document_type to milestone key
  v_milestone_key := CASE NEW.document_type
    WHEN 'reservation_contract' THEN 'res_contract_upload'
    WHEN 'grondplan' THEN 'koop_grondplan'
    WHEN 'specificaties' THEN 'koop_specificaties'
    WHEN 'bouwvergunning' THEN 'koop_bouwvergunning'
    WHEN 'kadastrale_fiche' THEN 'koop_kadastrale_fiche'
    WHEN 'eigendomsregister' THEN 'koop_eigendomsregister'
    WHEN 'bankgarantie' THEN 'koop_bankgarantie'
    WHEN 'koopovereenkomst' THEN 'koop_koopovereenkomst'
    WHEN 'elektriciteitsplan' THEN 'voorb_elektriciteitsplan'
    WHEN 'afmetingenplan' THEN 'voorb_afmetingenplan'
    ELSE NULL
  END;

  -- If we have a matching milestone key, update it
  IF v_milestone_key IS NOT NULL THEN
    UPDATE public.sale_milestones
    SET completed_at = COALESCE(completed_at, NOW()), updated_at = NOW()
    WHERE sale_id = NEW.sale_id
      AND milestone_key = v_milestone_key
      AND completed_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger for document uploads
DROP TRIGGER IF EXISTS trigger_auto_complete_on_document ON public.sale_documents;
CREATE TRIGGER trigger_auto_complete_on_document
AFTER INSERT ON public.sale_documents
FOR EACH ROW
EXECUTE FUNCTION public.auto_complete_milestone_on_document();

-- Function to auto-complete signature milestones
CREATE OR REPLACE FUNCTION public.auto_complete_milestone_on_signature()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if customer signed (reservation contract)
  IF NEW.signed_by_customer_at IS NOT NULL AND (OLD.signed_by_customer_at IS NULL OR OLD IS NULL) THEN
    -- Check if this is a reservation contract
    IF NEW.document_type = 'reservation_contract' THEN
      UPDATE public.sale_milestones
      SET completed_at = COALESCE(completed_at, NOW()), updated_at = NOW()
      WHERE sale_id = NEW.sale_id
        AND milestone_key = 'res_klant_ondertekend'
        AND completed_at IS NULL;
    -- Check if this is a koopovereenkomst
    ELSIF NEW.document_type = 'koopovereenkomst' THEN
      UPDATE public.sale_milestones
      SET completed_at = COALESCE(completed_at, NOW()), updated_at = NOW()
      WHERE sale_id = NEW.sale_id
        AND milestone_key = 'koop_klant_ondertekend'
        AND completed_at IS NULL;
    END IF;
  END IF;

  -- Check if developer signed (reservation contract)
  IF NEW.signed_by_developer_at IS NOT NULL AND (OLD.signed_by_developer_at IS NULL OR OLD IS NULL) THEN
    IF NEW.document_type = 'reservation_contract' THEN
      UPDATE public.sale_milestones
      SET completed_at = COALESCE(completed_at, NOW()), updated_at = NOW()
      WHERE sale_id = NEW.sale_id
        AND milestone_key = 'res_developer_ondertekend'
        AND completed_at IS NULL;
    ELSIF NEW.document_type = 'koopovereenkomst' THEN
      UPDATE public.sale_milestones
      SET completed_at = COALESCE(completed_at, NOW()), updated_at = NOW()
      WHERE sale_id = NEW.sale_id
        AND milestone_key = 'koop_developer_ondertekend'
        AND completed_at IS NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger for signature updates
DROP TRIGGER IF EXISTS trigger_auto_complete_on_signature ON public.sale_documents;
CREATE TRIGGER trigger_auto_complete_on_signature
AFTER UPDATE ON public.sale_documents
FOR EACH ROW
EXECUTE FUNCTION public.auto_complete_milestone_on_signature();

-- Function to auto-complete payment milestones
CREATE OR REPLACE FUNCTION public.auto_complete_milestone_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sale_id UUID;
  v_payment_index INT;
BEGIN
  -- Get the sale_id
  v_sale_id := NEW.sale_id;
  
  -- Only proceed if payment is marked as paid
  IF NEW.paid_at IS NOT NULL AND (OLD IS NULL OR OLD.paid_at IS NULL) THEN
    -- Get payment order index
    SELECT COUNT(*) INTO v_payment_index
    FROM public.sale_payments
    WHERE sale_id = v_sale_id
      AND due_date <= NEW.due_date;
    
    -- First payment = res_aanbetaling
    IF v_payment_index = 1 THEN
      UPDATE public.sale_milestones
      SET completed_at = COALESCE(completed_at, NOW()), updated_at = NOW()
      WHERE sale_id = v_sale_id
        AND milestone_key = 'res_aanbetaling'
        AND completed_at IS NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger for payment updates
DROP TRIGGER IF EXISTS trigger_auto_complete_on_payment ON public.sale_payments;
CREATE TRIGGER trigger_auto_complete_on_payment
AFTER INSERT OR UPDATE ON public.sale_payments
FOR EACH ROW
EXECUTE FUNCTION public.auto_complete_milestone_on_payment();

-- Function to auto-complete when payment schedule exists
CREATE OR REPLACE FUNCTION public.auto_complete_betaalplan_on_payment_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- When first payment is added, complete the betaalplan milestone
  UPDATE public.sale_milestones
  SET completed_at = COALESCE(completed_at, NOW()), updated_at = NOW()
  WHERE sale_id = NEW.sale_id
    AND milestone_key = 'res_betaalplan'
    AND completed_at IS NULL;

  RETURN NEW;
END;
$$;

-- Trigger for payment schedule creation
DROP TRIGGER IF EXISTS trigger_auto_complete_betaalplan ON public.sale_payments;
CREATE TRIGGER trigger_auto_complete_betaalplan
AFTER INSERT ON public.sale_payments
FOR EACH ROW
EXECUTE FUNCTION public.auto_complete_betaalplan_on_payment_insert();

-- Function to auto-complete reservation data milestone
CREATE OR REPLACE FUNCTION public.auto_complete_milestone_on_reservation_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sale_id UUID;
  v_all_complete BOOLEAN;
BEGIN
  -- Get the sale_id via sale_customer
  SELECT sc.sale_id INTO v_sale_id
  FROM public.sale_customers sc
  WHERE sc.id = NEW.sale_customer_id;

  IF v_sale_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if all reservation_details for this sale are complete
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.reservation_details rd
    JOIN public.sale_customers sc ON sc.id = rd.sale_customer_id
    WHERE sc.sale_id = v_sale_id
      AND (rd.data_complete IS NULL OR rd.data_complete = false)
  ) INTO v_all_complete;

  -- If all complete, mark the milestone
  IF v_all_complete THEN
    UPDATE public.sale_milestones
    SET completed_at = COALESCE(completed_at, NOW()), updated_at = NOW()
    WHERE sale_id = v_sale_id
      AND milestone_key = 'res_koperdata'
      AND completed_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger for reservation data updates
DROP TRIGGER IF EXISTS trigger_auto_complete_on_reservation_data ON public.reservation_details;
CREATE TRIGGER trigger_auto_complete_on_reservation_data
AFTER INSERT OR UPDATE ON public.reservation_details
FOR EACH ROW
EXECUTE FUNCTION public.auto_complete_milestone_on_reservation_data();

-- Function to auto-complete specification approval milestones
CREATE OR REPLACE FUNCTION public.auto_complete_milestone_on_spec_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_milestone_key TEXT;
BEGIN
  -- Map approval_type to milestone key
  v_milestone_key := CASE NEW.approval_type
    WHEN 'grondplan' THEN 'akk_grondplan'
    WHEN 'elektriciteitsplan' THEN 'akk_elektriciteitsplan'
    WHEN 'extras' THEN 'akk_extras'
    WHEN 'definitief' THEN 'akk_definitief'
    ELSE NULL
  END;

  -- If we have a matching milestone key, update it
  IF v_milestone_key IS NOT NULL AND NEW.approved_at IS NOT NULL THEN
    UPDATE public.sale_milestones
    SET completed_at = COALESCE(completed_at, NOW()), updated_at = NOW()
    WHERE sale_id = NEW.sale_id
      AND milestone_key = v_milestone_key
      AND completed_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger for specification approvals
DROP TRIGGER IF EXISTS trigger_auto_complete_on_spec_approval ON public.sale_specification_approvals;
CREATE TRIGGER trigger_auto_complete_on_spec_approval
AFTER INSERT OR UPDATE ON public.sale_specification_approvals
FOR EACH ROW
EXECUTE FUNCTION public.auto_complete_milestone_on_spec_approval();

-- Function to auto-complete snagging milestone
CREATE OR REPLACE FUNCTION public.auto_complete_milestone_on_snagging()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- When snagging inspection is completed
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
    UPDATE public.sale_milestones
    SET completed_at = COALESCE(completed_at, NOW()), updated_at = NOW()
    WHERE sale_id = NEW.sale_id
      AND milestone_key = 'overd_snagging'
      AND completed_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger for snagging completion
DROP TRIGGER IF EXISTS trigger_auto_complete_on_snagging ON public.snagging_inspections;
CREATE TRIGGER trigger_auto_complete_on_snagging
AFTER INSERT OR UPDATE ON public.snagging_inspections
FOR EACH ROW
EXECUTE FUNCTION public.auto_complete_milestone_on_snagging();
