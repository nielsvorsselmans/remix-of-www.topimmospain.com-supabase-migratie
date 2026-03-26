-- Drop the faulty trigger that tries to use NEW.sale_id
DROP TRIGGER IF EXISTS invalidate_materials_cache_on_option ON public.material_options;

-- Create a new function that correctly fetches sale_id via material_selections
CREATE OR REPLACE FUNCTION public.invalidate_materials_pdf_cache_for_option()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sale_id UUID;
BEGIN
  -- Get sale_id via the linked material_selection
  SELECT sale_id INTO v_sale_id
  FROM public.material_selections
  WHERE id = COALESCE(NEW.selection_id, OLD.selection_id);

  -- Invalidate the cache if we found a sale_id
  IF v_sale_id IS NOT NULL THEN
    DELETE FROM public.cached_pdfs 
    WHERE sale_id = v_sale_id
    AND pdf_type = 'materials';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create the corrected trigger
CREATE TRIGGER invalidate_materials_cache_on_option
AFTER INSERT OR UPDATE OR DELETE ON public.material_options
FOR EACH ROW 
EXECUTE FUNCTION public.invalidate_materials_pdf_cache_for_option();