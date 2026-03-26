-- Create sale_specification_approvals table for tracking per-item approvals
CREATE TABLE public.sale_specification_approvals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  approval_type TEXT NOT NULL CHECK (approval_type IN ('floor_plan', 'electrical_plan', 'extras', 'overall')),
  approved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_by_name TEXT NOT NULL,
  approved_by_user_id UUID REFERENCES auth.users(id),
  ip_address TEXT,
  customer_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(sale_id, approval_type)
);

-- Add specification_approved_at to sales table
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS specification_approved_at TIMESTAMP WITH TIME ZONE;

-- Enable RLS
ALTER TABLE public.sale_specification_approvals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage specification approvals"
ON public.sale_specification_approvals
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage specification approvals"
ON public.sale_specification_approvals
FOR ALL
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

CREATE POLICY "Customers can view their own approvals"
ON public.sale_specification_approvals
FOR SELECT
USING (
  sale_id IN (
    SELECT sc.sale_id FROM sale_customers sc
    JOIN crm_leads cl ON cl.id = sc.crm_lead_id
    WHERE cl.user_id = auth.uid()
  )
);

CREATE POLICY "Customers can insert their own approvals"
ON public.sale_specification_approvals
FOR INSERT
WITH CHECK (
  sale_id IN (
    SELECT sc.sale_id FROM sale_customers sc
    JOIN crm_leads cl ON cl.id = sc.crm_lead_id
    WHERE cl.user_id = auth.uid()
  )
);