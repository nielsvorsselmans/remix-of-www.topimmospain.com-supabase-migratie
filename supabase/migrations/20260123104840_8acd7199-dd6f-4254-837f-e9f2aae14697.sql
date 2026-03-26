-- Create cached_pdfs table for storing PDF cache metadata
CREATE TABLE public.cached_pdfs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  pdf_type TEXT NOT NULL CHECK (pdf_type IN ('materials', 'extras')),
  file_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(sale_id, pdf_type)
);

-- Enable RLS
ALTER TABLE public.cached_pdfs ENABLE ROW LEVEL SECURITY;

-- Create policies - admins can manage cached PDFs (using user_roles table)
CREATE POLICY "Admins can view cached PDFs"
ON public.cached_pdfs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Admins can insert cached PDFs"
ON public.cached_pdfs
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Admins can update cached PDFs"
ON public.cached_pdfs
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Admins can delete cached PDFs"
ON public.cached_pdfs
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Create function to invalidate PDF cache when materials change
CREATE OR REPLACE FUNCTION public.invalidate_materials_pdf_cache()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.cached_pdfs 
  WHERE sale_id = COALESCE(NEW.sale_id, OLD.sale_id)
  AND pdf_type = 'materials';
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create function to invalidate extras PDF cache
CREATE OR REPLACE FUNCTION public.invalidate_extras_pdf_cache()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.cached_pdfs 
  WHERE sale_id = COALESCE(NEW.sale_id, OLD.sale_id)
  AND pdf_type = 'extras';
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Triggers for material_selections
CREATE TRIGGER invalidate_materials_cache_on_selection
AFTER INSERT OR UPDATE OR DELETE ON public.material_selections
FOR EACH ROW EXECUTE FUNCTION public.invalidate_materials_pdf_cache();

-- Triggers for material_options
CREATE TRIGGER invalidate_materials_cache_on_option
AFTER INSERT OR UPDATE OR DELETE ON public.material_options
FOR EACH ROW EXECUTE FUNCTION public.invalidate_materials_pdf_cache();

-- Triggers for material_option_images
CREATE TRIGGER invalidate_materials_cache_on_image
AFTER INSERT OR UPDATE OR DELETE ON public.material_option_images
FOR EACH ROW EXECUTE FUNCTION public.invalidate_materials_pdf_cache();

-- Triggers for sale_extra_categories
CREATE TRIGGER invalidate_extras_cache_on_category
AFTER INSERT OR UPDATE OR DELETE ON public.sale_extra_categories
FOR EACH ROW EXECUTE FUNCTION public.invalidate_extras_pdf_cache();

-- Triggers for sale_extra_options
CREATE TRIGGER invalidate_extras_cache_on_option
AFTER INSERT OR UPDATE OR DELETE ON public.sale_extra_options
FOR EACH ROW EXECUTE FUNCTION public.invalidate_extras_pdf_cache();

-- Create index for faster lookups
CREATE INDEX idx_cached_pdfs_sale_type ON public.cached_pdfs(sale_id, pdf_type);