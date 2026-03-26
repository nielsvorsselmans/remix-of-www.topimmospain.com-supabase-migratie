-- Add commission type and fixed amount columns to projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS default_commission_type text DEFAULT 'percentage';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS default_commission_fixed numeric DEFAULT NULL;

-- Add commission type and fixed amount columns to sales
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS tis_commission_type text DEFAULT 'percentage';
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS tis_commission_fixed numeric DEFAULT NULL;

-- Add check constraints for valid commission types
ALTER TABLE public.projects ADD CONSTRAINT projects_commission_type_check 
  CHECK (default_commission_type IN ('percentage', 'fixed'));
  
ALTER TABLE public.sales ADD CONSTRAINT sales_commission_type_check 
  CHECK (tis_commission_type IN ('percentage', 'fixed'));