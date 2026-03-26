-- Add signature tracking columns to sale_documents
ALTER TABLE public.sale_documents
ADD COLUMN IF NOT EXISTS signed_by_customer_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS signed_by_developer_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS requires_customer_signature boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS requires_developer_signature boolean NOT NULL DEFAULT false;