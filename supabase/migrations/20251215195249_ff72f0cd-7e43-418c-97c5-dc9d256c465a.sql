-- Add sale_payment_id to link invoices to specific customer payments
ALTER TABLE public.sale_invoices 
ADD COLUMN IF NOT EXISTS sale_payment_id uuid REFERENCES public.sale_payments(id) ON DELETE SET NULL;

-- Add invoice_number for tracking
ALTER TABLE public.sale_invoices 
ADD COLUMN IF NOT EXISTS invoice_number text;

-- Add sent_at to track when invoice was sent to developer
ALTER TABLE public.sale_invoices 
ADD COLUMN IF NOT EXISTS sent_at timestamp with time zone;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_sale_invoices_sale_payment_id ON public.sale_invoices(sale_payment_id);
CREATE INDEX IF NOT EXISTS idx_sale_invoices_invoice_type ON public.sale_invoices(invoice_type);
CREATE INDEX IF NOT EXISTS idx_sale_invoices_status ON public.sale_invoices(status);