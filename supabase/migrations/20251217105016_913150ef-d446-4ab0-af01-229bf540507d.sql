-- Add approval columns to sale_extra_categories for per-category customer approval
ALTER TABLE public.sale_extra_categories
ADD COLUMN IF NOT EXISTS customer_approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS customer_approved_by_name TEXT,
ADD COLUMN IF NOT EXISTS customer_approved_by_user_id UUID,
ADD COLUMN IF NOT EXISTS customer_notes TEXT;