-- Add ambassador program terms columns to sale_extra_categories
ALTER TABLE public.sale_extra_categories 
ADD COLUMN ambassador_terms_required BOOLEAN DEFAULT false,
ADD COLUMN ambassador_terms_accepted_at TIMESTAMP WITH TIME ZONE;