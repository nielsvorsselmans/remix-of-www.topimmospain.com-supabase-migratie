-- Create trigger function to auto-complete res_facturen milestone when invoices are added
CREATE OR REPLACE FUNCTION public.auto_complete_facturen_milestone()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When invoice is inserted, mark res_facturen as completed
  UPDATE public.sale_milestones 
  SET completed_at = COALESCE(completed_at, NOW()), updated_at = NOW()
  WHERE sale_id = NEW.sale_id 
    AND template_key = 'res_facturen'
    AND completed_at IS NULL;
  
  RETURN NEW;
END;
$$;

-- Create trigger on sale_invoices
CREATE TRIGGER auto_complete_facturen_on_invoice_insert
  AFTER INSERT ON public.sale_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_complete_facturen_milestone();

-- Fix existing data: complete res_facturen tasks where invoices already exist
UPDATE public.sale_milestones sm
SET completed_at = NOW(), updated_at = NOW()
WHERE template_key = 'res_facturen'
  AND completed_at IS NULL
  AND EXISTS (
    SELECT 1 FROM public.sale_invoices si 
    WHERE si.sale_id = sm.sale_id
  );