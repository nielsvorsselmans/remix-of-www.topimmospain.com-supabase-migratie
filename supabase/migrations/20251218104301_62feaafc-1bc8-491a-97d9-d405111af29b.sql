-- Add acquisition type columns to sale_customization_requests
ALTER TABLE public.sale_customization_requests 
ADD COLUMN via_developer BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN gifted_by_tis BOOLEAN NOT NULL DEFAULT false;