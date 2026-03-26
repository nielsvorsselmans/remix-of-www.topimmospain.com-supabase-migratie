-- Create sale_invoices table for tracking invoices from developers and partners
CREATE TABLE public.sale_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  invoice_type TEXT NOT NULL CHECK (invoice_type IN ('developer', 'partner')),
  invoice_number TEXT,
  amount NUMERIC NOT NULL,
  invoice_date DATE,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  paid_at TIMESTAMP WITH TIME ZONE,
  file_url TEXT,
  notes TEXT,
  glide_invoice_id TEXT,
  customer_visible BOOLEAN DEFAULT true,
  partner_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sale_invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage sale invoices"
ON public.sale_invoices FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage sale invoices"
ON public.sale_invoices FOR ALL
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

CREATE POLICY "Partners can view their own invoices"
ON public.sale_invoices FOR SELECT
USING (
  partner_visible = true 
  AND partner_id IN (
    SELECT id FROM partners WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Customers can view their sale invoices"
ON public.sale_invoices FOR SELECT
USING (
  customer_visible = true
  AND sale_id IN (
    SELECT s.id FROM sales s
    JOIN sale_customers sc ON sc.sale_id = s.id
    JOIN crm_leads cl ON cl.id = sc.crm_lead_id
    WHERE cl.user_id = auth.uid()
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_sale_invoices_updated_at
BEFORE UPDATE ON public.sale_invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster queries
CREATE INDEX idx_sale_invoices_sale_id ON public.sale_invoices(sale_id);
CREATE INDEX idx_sale_invoices_partner_id ON public.sale_invoices(partner_id);