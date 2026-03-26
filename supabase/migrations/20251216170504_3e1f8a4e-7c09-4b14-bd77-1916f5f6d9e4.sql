-- Create sale_purchase_costs table for detailed cost tracking per sale
CREATE TABLE public.sale_purchase_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  cost_type TEXT NOT NULL,
  label TEXT NOT NULL,
  
  -- Estimated vs actual costs
  estimated_amount NUMERIC NOT NULL DEFAULT 0,
  actual_amount NUMERIC,
  is_finalized BOOLEAN DEFAULT false,
  
  -- Payment timing
  due_moment TEXT NOT NULL DEFAULT 'bij_akte',
  due_date DATE,
  is_paid BOOLEAN DEFAULT false,
  paid_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  percentage NUMERIC,
  is_optional BOOLEAN DEFAULT false,
  tooltip TEXT,
  notes TEXT,
  
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_sale_purchase_costs_sale_id ON public.sale_purchase_costs(sale_id);
CREATE INDEX idx_sale_purchase_costs_due_moment ON public.sale_purchase_costs(due_moment);

-- Enable RLS
ALTER TABLE public.sale_purchase_costs ENABLE ROW LEVEL SECURITY;

-- Admin policy
CREATE POLICY "Admins can manage purchase costs"
ON public.sale_purchase_costs
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role policy
CREATE POLICY "Service role can manage purchase costs"
ON public.sale_purchase_costs
FOR ALL
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Customer can view their sale costs
CREATE POLICY "Customers can view their sale costs"
ON public.sale_purchase_costs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.sale_customers sc
    JOIN public.crm_leads cl ON cl.id = sc.crm_lead_id
    WHERE sc.sale_id = sale_purchase_costs.sale_id
    AND cl.user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_sale_purchase_costs_updated_at
BEFORE UPDATE ON public.sale_purchase_costs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();