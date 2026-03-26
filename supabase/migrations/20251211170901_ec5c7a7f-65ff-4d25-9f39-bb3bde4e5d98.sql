-- Add is_optional_category column to sale_extra_categories
ALTER TABLE public.sale_extra_categories
ADD COLUMN is_optional_category boolean NOT NULL DEFAULT false;