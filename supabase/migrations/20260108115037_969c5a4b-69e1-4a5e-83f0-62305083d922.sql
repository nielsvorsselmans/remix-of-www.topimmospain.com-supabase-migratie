-- Create table for customization request attachments
CREATE TABLE public.customization_request_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.sale_customization_requests(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  uploaded_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.customization_request_attachments ENABLE ROW LEVEL SECURITY;

-- Admin full access policy
CREATE POLICY "Admin full access to request attachments"
  ON public.customization_request_attachments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
    )
  );

-- Customers can view their own request attachments
CREATE POLICY "Customers can view their request attachments"
  ON public.customization_request_attachments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sale_customization_requests r
      JOIN public.sales s ON s.id = r.sale_id
      JOIN public.sale_customers sc ON sc.sale_id = s.id
      JOIN public.crm_leads cl ON cl.id = sc.crm_lead_id
      WHERE r.id = request_id
      AND cl.user_id = auth.uid()
    )
  );

-- Create index for faster lookups
CREATE INDEX idx_customization_request_attachments_request_id 
  ON public.customization_request_attachments(request_id);