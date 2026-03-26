-- Create snagging_inspections table
CREATE TABLE public.snagging_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  inspection_type TEXT NOT NULL DEFAULT 'initial',
  inspector_name TEXT,
  status TEXT NOT NULL DEFAULT 'in_progress',
  sent_to_developer_at TIMESTAMPTZ,
  developer_response_deadline DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create snagging_items table
CREATE TABLE public.snagging_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES public.snagging_inspections(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  item_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  severity TEXT,
  notes TEXT,
  photo_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  resolved_at TIMESTAMPTZ,
  resolved_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.snagging_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snagging_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for snagging_inspections
CREATE POLICY "Admins can manage snagging inspections"
  ON public.snagging_inspections FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage snagging inspections"
  ON public.snagging_inspections FOR ALL
  USING ((auth.jwt() ->> 'role') = 'service_role');

CREATE POLICY "Customers can view own snagging inspections"
  ON public.snagging_inspections FOR SELECT
  USING (
    sale_id IN (
      SELECT sc.sale_id FROM public.sale_customers sc
      JOIN public.crm_leads cl ON sc.crm_lead_id = cl.id
      WHERE cl.user_id = auth.uid()
    )
  );

-- RLS policies for snagging_items
CREATE POLICY "Admins can manage snagging items"
  ON public.snagging_items FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage snagging items"
  ON public.snagging_items FOR ALL
  USING ((auth.jwt() ->> 'role') = 'service_role');

CREATE POLICY "Customers can view own snagging items"
  ON public.snagging_items FOR SELECT
  USING (
    inspection_id IN (
      SELECT si.id FROM public.snagging_inspections si
      JOIN public.sale_customers sc ON si.sale_id = sc.sale_id
      JOIN public.crm_leads cl ON sc.crm_lead_id = cl.id
      WHERE cl.user_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX idx_snagging_inspections_sale_id ON public.snagging_inspections(sale_id);
CREATE INDEX idx_snagging_items_inspection_id ON public.snagging_items(inspection_id);
CREATE INDEX idx_snagging_items_status ON public.snagging_items(status);

-- Triggers for updated_at
CREATE TRIGGER update_snagging_inspections_updated_at
  BEFORE UPDATE ON public.snagging_inspections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_snagging_items_updated_at
  BEFORE UPDATE ON public.snagging_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();