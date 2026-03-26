
-- Create sale_extra_categories table
CREATE TABLE public.sale_extra_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_included BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'decided')),
  chosen_option_id UUID,
  decided_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  customer_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sale_extra_options table
CREATE TABLE public.sale_extra_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.sale_extra_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC(10, 2),
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key for chosen_option_id after sale_extra_options exists
ALTER TABLE public.sale_extra_categories 
ADD CONSTRAINT fk_chosen_option 
FOREIGN KEY (chosen_option_id) REFERENCES public.sale_extra_options(id) ON DELETE SET NULL;

-- Create sale_extra_attachments table
CREATE TABLE public.sale_extra_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  option_id UUID NOT NULL REFERENCES public.sale_extra_options(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  title TEXT,
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sale_extra_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_extra_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_extra_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sale_extra_categories
CREATE POLICY "Admins can manage sale extra categories"
ON public.sale_extra_categories FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Customers can view their sale extra categories"
ON public.sale_extra_categories FOR SELECT
USING (
  customer_visible = true AND
  sale_id IN (
    SELECT sc.sale_id FROM public.sale_customers sc
    JOIN public.crm_leads cl ON sc.crm_lead_id = cl.id
    WHERE cl.user_id = auth.uid()
  )
);

CREATE POLICY "Partners can view sale extra categories"
ON public.sale_extra_categories FOR SELECT
USING (
  sale_id IN (
    SELECT sp.sale_id FROM public.sale_partners sp
    JOIN public.partners p ON sp.partner_id = p.id
    WHERE p.user_id = auth.uid()
  )
);

-- RLS Policies for sale_extra_options
CREATE POLICY "Admins can manage sale extra options"
ON public.sale_extra_options FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Customers can view sale extra options"
ON public.sale_extra_options FOR SELECT
USING (
  category_id IN (
    SELECT sec.id FROM public.sale_extra_categories sec
    JOIN public.sale_customers sc ON sec.sale_id = sc.sale_id
    JOIN public.crm_leads cl ON sc.crm_lead_id = cl.id
    WHERE cl.user_id = auth.uid() AND sec.customer_visible = true
  )
);

CREATE POLICY "Partners can view sale extra options"
ON public.sale_extra_options FOR SELECT
USING (
  category_id IN (
    SELECT sec.id FROM public.sale_extra_categories sec
    JOIN public.sale_partners sp ON sec.sale_id = sp.sale_id
    JOIN public.partners p ON sp.partner_id = p.id
    WHERE p.user_id = auth.uid()
  )
);

-- RLS Policies for sale_extra_attachments
CREATE POLICY "Admins can manage sale extra attachments"
ON public.sale_extra_attachments FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Customers can view sale extra attachments"
ON public.sale_extra_attachments FOR SELECT
USING (
  option_id IN (
    SELECT seo.id FROM public.sale_extra_options seo
    JOIN public.sale_extra_categories sec ON seo.category_id = sec.id
    JOIN public.sale_customers sc ON sec.sale_id = sc.sale_id
    JOIN public.crm_leads cl ON sc.crm_lead_id = cl.id
    WHERE cl.user_id = auth.uid() AND sec.customer_visible = true
  )
);

CREATE POLICY "Partners can view sale extra attachments"
ON public.sale_extra_attachments FOR SELECT
USING (
  option_id IN (
    SELECT seo.id FROM public.sale_extra_options seo
    JOIN public.sale_extra_categories sec ON seo.category_id = sec.id
    JOIN public.sale_partners sp ON sec.sale_id = sp.sale_id
    JOIN public.partners p ON sp.partner_id = p.id
    WHERE p.user_id = auth.uid()
  )
);

-- Create storage bucket for attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('sale-extra-attachments', 'sale-extra-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Admins can upload sale extra attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'sale-extra-attachments' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update sale extra attachments"
ON storage.objects FOR UPDATE
USING (bucket_id = 'sale-extra-attachments' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete sale extra attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'sale-extra-attachments' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view sale extra attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'sale-extra-attachments' AND auth.uid() IS NOT NULL);

-- Indexes for performance
CREATE INDEX idx_sale_extra_categories_sale_id ON public.sale_extra_categories(sale_id);
CREATE INDEX idx_sale_extra_options_category_id ON public.sale_extra_options(category_id);
CREATE INDEX idx_sale_extra_attachments_option_id ON public.sale_extra_attachments(option_id);

-- Update triggers
CREATE TRIGGER update_sale_extra_categories_updated_at
BEFORE UPDATE ON public.sale_extra_categories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sale_extra_options_updated_at
BEFORE UPDATE ON public.sale_extra_options
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
