-- Add optional price column to material_options table
ALTER TABLE public.material_options 
ADD COLUMN price numeric(10,2) DEFAULT NULL;