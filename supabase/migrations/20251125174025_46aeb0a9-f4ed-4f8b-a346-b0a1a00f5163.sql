-- Create crm_leads table for consolidated CRM user tracking
CREATE TABLE public.crm_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crm_user_id TEXT UNIQUE NOT NULL,
  
  -- Contact info (from mailing system)
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  
  -- Tracking links
  visitor_id TEXT,
  user_id UUID REFERENCES auth.users(id),
  ghl_contact_id TEXT,
  
  -- Mailing context
  source_campaign TEXT,
  source_email TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  
  -- Engagement metrics
  first_visit_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_visit_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  total_visits INTEGER DEFAULT 1,
  total_page_views INTEGER DEFAULT 0,
  total_project_views INTEGER DEFAULT 0,
  
  -- Inferred preferences (calculated from behavior)
  inferred_budget_min NUMERIC,
  inferred_budget_max NUMERIC,
  inferred_regions TEXT[] DEFAULT '{}',
  inferred_cities TEXT[] DEFAULT '{}',
  most_viewed_projects UUID[] DEFAULT '{}',
  
  -- Follow-up status
  follow_up_status TEXT DEFAULT 'new',
  last_follow_up_at TIMESTAMP WITH TIME ZONE,
  next_follow_up_at TIMESTAMP WITH TIME ZONE,
  follow_up_notes TEXT,
  
  -- Feedback tracking
  feedback_requested_at TIMESTAMP WITH TIME ZONE,
  feedback_received_at TIMESTAMP WITH TIME ZONE,
  feedback_score INTEGER,
  feedback_text TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;

-- Admins can manage all CRM leads
CREATE POLICY "Admins can manage crm_leads"
  ON public.crm_leads
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can manage CRM leads
CREATE POLICY "Service role can manage crm_leads"
  ON public.crm_leads
  FOR ALL
  USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Create index for faster lookups
CREATE INDEX idx_crm_leads_crm_user_id ON public.crm_leads(crm_user_id);
CREATE INDEX idx_crm_leads_visitor_id ON public.crm_leads(visitor_id);
CREATE INDEX idx_crm_leads_user_id ON public.crm_leads(user_id);
CREATE INDEX idx_crm_leads_follow_up_status ON public.crm_leads(follow_up_status);

-- Create updated_at trigger
CREATE TRIGGER update_crm_leads_updated_at
  BEFORE UPDATE ON public.crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();