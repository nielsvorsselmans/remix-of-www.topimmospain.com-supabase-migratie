-- Drop the faulty trigger that tries to access NEW.sale_id on sale_extra_options
DROP TRIGGER IF EXISTS invalidate_extras_cache_on_option ON public.sale_extra_options;

-- Create a new trigger function specifically for sale_extra_options
-- This function looks up the sale_id via the category relationship
CREATE OR REPLACE FUNCTION public.invalidate_extras_pdf_cache_for_option()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sale_id UUID;
BEGIN
  -- Get sale_id via the linked category
  SELECT sale_id INTO v_sale_id
  FROM public.sale_extra_categories
  WHERE id = COALESCE(NEW.category_id, OLD.category_id);

  -- Invalidate cache if we found a sale_id
  IF v_sale_id IS NOT NULL THEN
    DELETE FROM public.cached_pdfs 
    WHERE sale_id = v_sale_id
    AND pdf_type = 'extras';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create the new trigger using the corrected function
CREATE TRIGGER invalidate_extras_cache_on_option
AFTER INSERT OR UPDATE OR DELETE ON public.sale_extra_options
FOR EACH ROW EXECUTE FUNCTION public.invalidate_extras_pdf_cache_for_option();