-- Add tracking column to prevent re-creation of deleted default categories
ALTER TABLE public.sales 
ADD COLUMN extras_initialized BOOLEAN DEFAULT false;

-- Mark existing sales that already have categories as initialized
UPDATE public.sales s
SET extras_initialized = true
WHERE EXISTS (
  SELECT 1 FROM public.sale_extra_categories sec 
  WHERE sec.sale_id = s.id
);