-- Create sale_payments table for tracking payment schedules
CREATE TABLE public.sale_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  
  -- Payment details
  title TEXT NOT NULL,
  description TEXT,
  amount NUMERIC NOT NULL,
  percentage NUMERIC,
  
  -- Timing
  due_date DATE,
  due_condition TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  paid_at TIMESTAMP WITH TIME ZONE,
  paid_amount NUMERIC,
  
  -- Proof of payment
  proof_file_url TEXT,
  proof_file_name TEXT,
  proof_uploaded_at TIMESTAMP WITH TIME ZONE,
  
  -- Visibility
  customer_visible BOOLEAN NOT NULL DEFAULT true,
  partner_visible BOOLEAN NOT NULL DEFAULT true,
  
  -- Admin notes
  admin_notes TEXT,
  
  -- Ordering
  order_index INTEGER NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sale_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage all sale payments"
ON public.sale_payments
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage sale payments"
ON public.sale_payments
FOR ALL
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

CREATE POLICY "Customers can view their own sale payments"
ON public.sale_payments
FOR SELECT
USING (
  customer_visible = true
  AND sale_id IN (
    SELECT sc.sale_id FROM public.sale_customers sc
    JOIN public.crm_leads cl ON sc.crm_lead_id = cl.id
    WHERE cl.user_id = auth.uid()
  )
);

CREATE POLICY "Partners can view their sale payments"
ON public.sale_payments
FOR SELECT
USING (
  partner_visible = true
  AND sale_id IN (
    SELECT sp.sale_id FROM public.sale_partners sp
    JOIN public.partners p ON sp.partner_id = p.id
    WHERE p.user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_sale_payments_updated_at
  BEFORE UPDATE ON public.sale_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for faster queries
CREATE INDEX idx_sale_payments_sale_id ON public.sale_payments(sale_id);
CREATE INDEX idx_sale_payments_status ON public.sale_payments(status);