-- Create customer_travel_guides table
CREATE TABLE public.customer_travel_guides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  crm_lead_id UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  viewing_trip_id UUID REFERENCES public.customer_viewing_trips(id) ON DELETE SET NULL,
  sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Jouw Persoonlijke Reisgids',
  intro_text TEXT,
  municipality TEXT,
  region TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create customer_travel_guide_pois junction table
CREATE TABLE public.customer_travel_guide_pois (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guide_id UUID NOT NULL REFERENCES public.customer_travel_guides(id) ON DELETE CASCADE,
  poi_id UUID NOT NULL REFERENCES public.travel_guide_pois(id) ON DELETE CASCADE,
  custom_note TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(guide_id, poi_id)
);

-- Enable RLS
ALTER TABLE public.customer_travel_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_travel_guide_pois ENABLE ROW LEVEL SECURITY;

-- RLS policies for customer_travel_guides
CREATE POLICY "Admins can manage travel guides"
ON public.customer_travel_guides
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Users can view their own travel guides"
ON public.customer_travel_guides
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.crm_leads
    WHERE crm_leads.id = customer_travel_guides.crm_lead_id
    AND crm_leads.user_id = auth.uid()
  )
);

-- RLS policies for customer_travel_guide_pois
CREATE POLICY "Admins can manage travel guide POIs"
ON public.customer_travel_guide_pois
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Users can view their own travel guide POIs"
ON public.customer_travel_guide_pois
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.customer_travel_guides g
    JOIN public.crm_leads l ON l.id = g.crm_lead_id
    WHERE g.id = customer_travel_guide_pois.guide_id
    AND l.user_id = auth.uid()
  )
);

-- Create indexes for performance
CREATE INDEX idx_customer_travel_guides_crm_lead ON public.customer_travel_guides(crm_lead_id);
CREATE INDEX idx_customer_travel_guides_trip ON public.customer_travel_guides(viewing_trip_id);
CREATE INDEX idx_customer_travel_guides_sale ON public.customer_travel_guides(sale_id);
CREATE INDEX idx_customer_travel_guide_pois_guide ON public.customer_travel_guide_pois(guide_id);
CREATE INDEX idx_customer_travel_guide_pois_poi ON public.customer_travel_guide_pois(poi_id);

-- Trigger for updated_at
CREATE TRIGGER update_customer_travel_guides_updated_at
BEFORE UPDATE ON public.customer_travel_guides
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();