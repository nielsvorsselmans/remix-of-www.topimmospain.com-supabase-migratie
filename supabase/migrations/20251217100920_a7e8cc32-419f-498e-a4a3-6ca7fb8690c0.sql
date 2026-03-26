-- Create table for customization requests
CREATE TABLE public.sale_customization_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- 'floor_plan', 'electrical', 'extras', 'other'
  request_title TEXT NOT NULL,
  request_description TEXT NOT NULL,
  attachment_url TEXT,
  admin_response TEXT,
  additional_cost NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, discussed, approved, rejected
  created_by_user_id UUID REFERENCES auth.users(id),
  responded_by_user_id UUID REFERENCES auth.users(id),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sale_customization_requests ENABLE ROW LEVEL SECURITY;

-- Customers can view their own requests (via sale_customers link)
CREATE POLICY "Customers can view their own customization requests"
ON public.sale_customization_requests
FOR SELECT
USING (
  sale_id IN (
    SELECT sc.sale_id FROM sale_customers sc
    JOIN crm_leads cl ON cl.id = sc.crm_lead_id
    WHERE cl.user_id = auth.uid()
  )
);

-- Customers can create their own requests
CREATE POLICY "Customers can create customization requests"
ON public.sale_customization_requests
FOR INSERT
WITH CHECK (
  sale_id IN (
    SELECT sc.sale_id FROM sale_customers sc
    JOIN crm_leads cl ON cl.id = sc.crm_lead_id
    WHERE cl.user_id = auth.uid()
  )
);

-- Admins can manage all requests
CREATE POLICY "Admins can manage customization requests"
ON public.sale_customization_requests
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can manage all requests
CREATE POLICY "Service role can manage customization requests"
ON public.sale_customization_requests
FOR ALL
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Create index for faster lookups
CREATE INDEX idx_customization_requests_sale_id ON public.sale_customization_requests(sale_id);
CREATE INDEX idx_customization_requests_status ON public.sale_customization_requests(status);