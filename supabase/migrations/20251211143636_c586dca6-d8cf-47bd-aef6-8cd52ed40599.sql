
-- Create sales status enum
CREATE TYPE public.sale_status AS ENUM (
  'reservation',
  'contract_signed', 
  'financing',
  'notary_scheduled',
  'completed',
  'cancelled'
);

-- Create sale partner role enum
CREATE TYPE public.sale_partner_role AS ENUM (
  'referring_partner',
  'financing_partner',
  'legal_partner',
  'other'
);

-- Create sale customer role enum  
CREATE TYPE public.sale_customer_role AS ENUM (
  'buyer',
  'co_buyer'
);

-- Main sales table
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Property info
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  property_description TEXT,
  
  -- Financial
  sale_price NUMERIC,
  deposit_amount NUMERIC,
  deposit_paid_at TIMESTAMP WITH TIME ZONE,
  
  -- Status & dates
  status sale_status NOT NULL DEFAULT 'reservation',
  reservation_date DATE,
  contract_date DATE,
  notary_date DATE,
  completion_date DATE,
  expected_delivery_date DATE,
  
  -- Notes
  admin_notes TEXT,
  customer_visible_notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Sale customers junction table
CREATE TABLE public.sale_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  crm_lead_id UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  role sale_customer_role NOT NULL DEFAULT 'buyer',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(sale_id, crm_lead_id)
);

-- Sale partners junction table
CREATE TABLE public.sale_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  role sale_partner_role NOT NULL DEFAULT 'referring_partner',
  commission_percentage NUMERIC,
  commission_amount NUMERIC,
  commission_paid_at TIMESTAMP WITH TIME ZONE,
  access_level TEXT NOT NULL DEFAULT 'basic', -- 'basic', 'full', 'financial'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(sale_id, partner_id, role)
);

-- Sale milestones for timeline
CREATE TABLE public.sale_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,
  description TEXT,
  
  -- Timeline
  target_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Visibility
  customer_visible BOOLEAN NOT NULL DEFAULT true,
  partner_visible BOOLEAN NOT NULL DEFAULT false,
  
  -- Ordering
  order_index INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Sale documents
CREATE TABLE public.sale_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,
  description TEXT,
  document_type TEXT NOT NULL DEFAULT 'other', -- 'contract', 'financial', 'notary', 'technical', 'other'
  
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  
  -- Visibility
  customer_visible BOOLEAN NOT NULL DEFAULT false,
  partner_visible BOOLEAN NOT NULL DEFAULT false,
  
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  uploaded_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on all tables
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sales
CREATE POLICY "Admins can manage all sales"
ON public.sales FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Customers can view their own sales"
ON public.sales FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.sale_customers sc
    JOIN public.crm_leads cl ON sc.crm_lead_id = cl.id
    WHERE sc.sale_id = sales.id AND cl.user_id = auth.uid()
  )
);

CREATE POLICY "Partners can view their linked sales"
ON public.sales FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.sale_partners sp
    JOIN public.partners p ON sp.partner_id = p.id
    WHERE sp.sale_id = sales.id AND p.user_id = auth.uid()
  )
);

-- RLS Policies for sale_customers
CREATE POLICY "Admins can manage sale_customers"
ON public.sale_customers FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Customers can view their own sale_customers"
ON public.sale_customers FOR SELECT
USING (
  crm_lead_id IN (
    SELECT id FROM public.crm_leads WHERE user_id = auth.uid()
  )
);

-- RLS Policies for sale_partners
CREATE POLICY "Admins can manage sale_partners"
ON public.sale_partners FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Partners can view their own sale_partners"
ON public.sale_partners FOR SELECT
USING (
  partner_id IN (
    SELECT id FROM public.partners WHERE user_id = auth.uid()
  )
);

-- RLS Policies for sale_milestones
CREATE POLICY "Admins can manage sale_milestones"
ON public.sale_milestones FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Customers can view customer_visible milestones"
ON public.sale_milestones FOR SELECT
USING (
  customer_visible = true AND
  EXISTS (
    SELECT 1 FROM public.sale_customers sc
    JOIN public.crm_leads cl ON sc.crm_lead_id = cl.id
    WHERE sc.sale_id = sale_milestones.sale_id AND cl.user_id = auth.uid()
  )
);

CREATE POLICY "Partners can view partner_visible milestones"
ON public.sale_milestones FOR SELECT
USING (
  partner_visible = true AND
  EXISTS (
    SELECT 1 FROM public.sale_partners sp
    JOIN public.partners p ON sp.partner_id = p.id
    WHERE sp.sale_id = sale_milestones.sale_id AND p.user_id = auth.uid()
  )
);

-- RLS Policies for sale_documents
CREATE POLICY "Admins can manage sale_documents"
ON public.sale_documents FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Customers can view customer_visible documents"
ON public.sale_documents FOR SELECT
USING (
  customer_visible = true AND
  EXISTS (
    SELECT 1 FROM public.sale_customers sc
    JOIN public.crm_leads cl ON sc.crm_lead_id = cl.id
    WHERE sc.sale_id = sale_documents.sale_id AND cl.user_id = auth.uid()
  )
);

CREATE POLICY "Partners can view partner_visible documents"
ON public.sale_documents FOR SELECT
USING (
  partner_visible = true AND
  EXISTS (
    SELECT 1 FROM public.sale_partners sp
    JOIN public.partners p ON sp.partner_id = p.id
    WHERE sp.sale_id = sale_documents.sale_id AND p.user_id = auth.uid()
  )
);

-- Triggers for updated_at
CREATE TRIGGER update_sales_updated_at
BEFORE UPDATE ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sale_milestones_updated_at
BEFORE UPDATE ON public.sale_milestones
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for sale documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('sale-documents', 'sale-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for sale-documents bucket
CREATE POLICY "Admins can manage sale documents storage"
ON storage.objects FOR ALL
USING (bucket_id = 'sale-documents' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view sale documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'sale-documents' AND auth.uid() IS NOT NULL);
