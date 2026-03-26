-- =============================================
-- FASE 1: CRM Systeem Uitbreiding
-- =============================================

-- 1.1 Uitbreiding crm_leads tabel met journey tracking
ALTER TABLE public.crm_leads 
ADD COLUMN IF NOT EXISTS journey_phase text DEFAULT 'orientatie',
ADD COLUMN IF NOT EXISTS journey_phase_updated_at timestamptz,
ADD COLUMN IF NOT EXISTS journey_phase_updated_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS admin_notes text;

-- Voeg check constraint toe voor geldige journey phases
ALTER TABLE public.crm_leads 
ADD CONSTRAINT valid_journey_phase CHECK (
  journey_phase IN ('orientatie', 'selectie', 'bezichtiging', 'aankoop', 'overdracht', 'beheer')
);

-- 1.2 Nieuwe tabel: customer_project_selections
CREATE TABLE public.customer_project_selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crm_lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users(id),
  assigned_at timestamptz DEFAULT now(),
  status text DEFAULT 'suggested',
  priority integer DEFAULT 0,
  admin_notes text,
  customer_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(crm_lead_id, project_id),
  CONSTRAINT valid_selection_status CHECK (
    status IN ('suggested', 'interested', 'visited', 'rejected')
  )
);

-- Enable RLS on customer_project_selections
ALTER TABLE public.customer_project_selections ENABLE ROW LEVEL SECURITY;

-- RLS Policies voor customer_project_selections
CREATE POLICY "Admins can manage selections" 
ON public.customer_project_selections 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage selections" 
ON public.customer_project_selections 
FOR ALL 
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

CREATE POLICY "Customers can view own selections" 
ON public.customer_project_selections 
FOR SELECT 
USING (
  crm_lead_id IN (
    SELECT id FROM public.crm_leads WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Customers can update own selection notes" 
ON public.customer_project_selections 
FOR UPDATE 
USING (
  crm_lead_id IN (
    SELECT id FROM public.crm_leads WHERE user_id = auth.uid()
  )
);

-- 1.3 Nieuwe tabel: customer_viewing_trips
CREATE TABLE public.customer_viewing_trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crm_lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  trip_start_date date NOT NULL,
  trip_end_date date NOT NULL,
  status text DEFAULT 'planned',
  accommodation_info text,
  flight_info text,
  scheduled_viewings jsonb DEFAULT '[]'::jsonb,
  admin_notes text,
  customer_notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_trip_status CHECK (
    status IN ('planned', 'confirmed', 'completed', 'cancelled')
  ),
  CONSTRAINT valid_trip_dates CHECK (trip_end_date >= trip_start_date)
);

-- Enable RLS on customer_viewing_trips
ALTER TABLE public.customer_viewing_trips ENABLE ROW LEVEL SECURITY;

-- RLS Policies voor customer_viewing_trips
CREATE POLICY "Admins can manage trips" 
ON public.customer_viewing_trips 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage trips" 
ON public.customer_viewing_trips 
FOR ALL 
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

CREATE POLICY "Customers can view own trips" 
ON public.customer_viewing_trips 
FOR SELECT 
USING (
  crm_lead_id IN (
    SELECT id FROM public.crm_leads WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Customers can update own trip notes" 
ON public.customer_viewing_trips 
FOR UPDATE 
USING (
  crm_lead_id IN (
    SELECT id FROM public.crm_leads WHERE user_id = auth.uid()
  )
);

-- 1.4 Indexes voor performance
CREATE INDEX idx_customer_project_selections_crm_lead ON public.customer_project_selections(crm_lead_id);
CREATE INDEX idx_customer_project_selections_project ON public.customer_project_selections(project_id);
CREATE INDEX idx_customer_viewing_trips_crm_lead ON public.customer_viewing_trips(crm_lead_id);
CREATE INDEX idx_customer_viewing_trips_dates ON public.customer_viewing_trips(trip_start_date, trip_end_date);
CREATE INDEX idx_crm_leads_journey_phase ON public.crm_leads(journey_phase);

-- 1.5 Updated_at triggers
CREATE TRIGGER update_customer_project_selections_updated_at
  BEFORE UPDATE ON public.customer_project_selections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customer_viewing_trips_updated_at
  BEFORE UPDATE ON public.customer_viewing_trips
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();