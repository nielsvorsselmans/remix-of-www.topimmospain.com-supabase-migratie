-- Kostenindicaties tabel voor opgeslagen scenario's
CREATE TABLE public.cost_estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  project_name TEXT NOT NULL,
  project_image TEXT,
  location TEXT,
  base_price NUMERIC NOT NULL,
  property_type TEXT NOT NULL DEFAULT 'nieuwbouw',
  itp_rate NUMERIC DEFAULT 7.75,
  extras JSONB DEFAULT '[]'::jsonb,
  costs JSONB DEFAULT '{}'::jsonb,
  delivery_date TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Toewijzingen tabel om kostenindicaties aan klanten te koppelen
CREATE TABLE public.cost_estimate_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cost_estimate_id UUID REFERENCES public.cost_estimates(id) ON DELETE CASCADE NOT NULL,
  crm_lead_id UUID REFERENCES public.crm_leads(id) ON DELETE CASCADE NOT NULL,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'pending',
  customer_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(cost_estimate_id, crm_lead_id)
);

-- Enable RLS
ALTER TABLE public.cost_estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_estimate_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policies for cost_estimates

-- Admins kunnen alles zien en doen
CREATE POLICY "Admins full access cost_estimates" ON public.cost_estimates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Partners kunnen hun eigen indicaties zien en beheren
CREATE POLICY "Partners manage own cost_estimates" ON public.cost_estimates
  FOR ALL USING (
    created_by = auth.uid()
  );

-- Klanten kunnen hun toegewezen indicaties zien
CREATE POLICY "Customers view assigned cost_estimates" ON public.cost_estimates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.cost_estimate_assignments cea
      JOIN public.crm_leads cl ON cea.crm_lead_id = cl.id
      WHERE cea.cost_estimate_id = cost_estimates.id
      AND cl.user_id = auth.uid()
    )
  );

-- RLS policies for cost_estimate_assignments

-- Admins kunnen alles zien en doen
CREATE POLICY "Admins full access cost_estimate_assignments" ON public.cost_estimate_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Partners kunnen toewijzingen zien voor hun eigen indicaties
CREATE POLICY "Partners manage own assignments" ON public.cost_estimate_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.cost_estimates ce
      WHERE ce.id = cost_estimate_assignments.cost_estimate_id
      AND ce.created_by = auth.uid()
    )
  );

-- Klanten kunnen hun eigen toewijzingen zien en updaten
CREATE POLICY "Customers view own assignments" ON public.cost_estimate_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.crm_leads cl
      WHERE cl.id = cost_estimate_assignments.crm_lead_id
      AND cl.user_id = auth.uid()
    )
  );

CREATE POLICY "Customers update own assignments" ON public.cost_estimate_assignments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.crm_leads cl
      WHERE cl.id = cost_estimate_assignments.crm_lead_id
      AND cl.user_id = auth.uid()
    )
  );

-- Trigger voor updated_at
CREATE TRIGGER update_cost_estimates_updated_at
  BEFORE UPDATE ON public.cost_estimates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes voor performance
CREATE INDEX idx_cost_estimates_created_by ON public.cost_estimates(created_by);
CREATE INDEX idx_cost_estimate_assignments_estimate ON public.cost_estimate_assignments(cost_estimate_id);
CREATE INDEX idx_cost_estimate_assignments_lead ON public.cost_estimate_assignments(crm_lead_id);