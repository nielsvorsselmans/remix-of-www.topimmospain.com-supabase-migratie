-- Add TIS commission percentage column to sales table
ALTER TABLE public.sales ADD COLUMN tis_commission_percentage numeric DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.sales.tis_commission_percentage IS 'TIS commission percentage of sale_price (excluding extras like airco/furniture)';