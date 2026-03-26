-- Add related_developer_invoice_id to link partner invoices to their TIS invoice
ALTER TABLE public.sale_invoices 
ADD COLUMN IF NOT EXISTS related_developer_invoice_id UUID REFERENCES public.sale_invoices(id) ON DELETE CASCADE;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sale_invoices_related_developer ON public.sale_invoices(related_developer_invoice_id) WHERE related_developer_invoice_id IS NOT NULL;

-- Comment for clarity
COMMENT ON COLUMN public.sale_invoices.related_developer_invoice_id IS 'Links partner invoices to their corresponding TIS/developer invoice for automatic calculation';