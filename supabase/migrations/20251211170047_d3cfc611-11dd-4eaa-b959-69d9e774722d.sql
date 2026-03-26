-- Add gifted_by_tis column to sale_extra_categories
ALTER TABLE public.sale_extra_categories 
ADD COLUMN IF NOT EXISTS gifted_by_tis boolean NOT NULL DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN public.sale_extra_categories.gifted_by_tis IS 'Indicates if this extra is gifted by Top Immo Spain from their commission';