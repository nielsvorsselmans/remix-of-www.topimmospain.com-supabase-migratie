-- Hide 'res_facturen' from customers (admin-only task)
UPDATE public.sale_milestones 
SET customer_visible = false 
WHERE template_key = 'res_facturen';

-- Add trigger for signed_reservation_contract uploads
CREATE OR REPLACE FUNCTION public.auto_complete_milestone_on_signed_contract()
RETURNS TRIGGER AS $$
BEGIN
  -- When signed_reservation_contract is uploaded
  IF NEW.document_type = 'signed_reservation_contract' THEN
    UPDATE public.sale_milestones
    SET completed_at = COALESCE(completed_at, NOW()), updated_at = NOW()
    WHERE sale_id = NEW.sale_id
      AND template_key = 'res_klant_ondertekend'
      AND completed_at IS NULL;
  END IF;

  -- When signed_purchase_contract is uploaded  
  IF NEW.document_type = 'signed_purchase_contract' THEN
    UPDATE public.sale_milestones
    SET completed_at = COALESCE(completed_at, NOW()), updated_at = NOW()
    WHERE sale_id = NEW.sale_id
      AND template_key = 'koop_klant_ondertekend'
      AND completed_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for signed contract uploads
DROP TRIGGER IF EXISTS trg_auto_complete_signed_contract ON public.sale_documents;
CREATE TRIGGER trg_auto_complete_signed_contract
  AFTER INSERT ON public.sale_documents
  FOR EACH ROW
  WHEN (NEW.document_type IN ('signed_reservation_contract', 'signed_purchase_contract'))
  EXECUTE FUNCTION public.auto_complete_milestone_on_signed_contract();