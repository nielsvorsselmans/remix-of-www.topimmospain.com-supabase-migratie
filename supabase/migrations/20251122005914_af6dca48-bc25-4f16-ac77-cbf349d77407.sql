-- Create project qualification flows table
CREATE TABLE public.project_qualification_flows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Flow data
  usage_type TEXT CHECK (usage_type IN ('eigen_gebruik', 'investering', 'combinatie')),
  region_familiarity TEXT CHECK (region_familiarity IN ('ja', 'nee')),
  budget_range TEXT,
  property_type_preference TEXT,
  timeframe TEXT,
  notes TEXT,
  
  -- Contact info (optional)
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  wants_call BOOLEAN DEFAULT false,
  
  -- Flow outcome
  flow_outcome TEXT CHECK (flow_outcome IN ('portaal', 'rekentool', 'call', 'afgebroken')),
  
  -- Source tracking
  source_url TEXT,
  utm_source TEXT,
  utm_campaign TEXT,
  utm_medium TEXT
);

-- Enable RLS
ALTER TABLE public.project_qualification_flows ENABLE ROW LEVEL SECURITY;

-- Anyone can create a qualification flow
CREATE POLICY "Anyone can submit qualification flows"
ON public.project_qualification_flows
FOR INSERT
WITH CHECK (true);

-- Admins can view all flows
CREATE POLICY "Admins can view all qualification flows"
ON public.project_qualification_flows
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update flows
CREATE POLICY "Admins can update qualification flows"
ON public.project_qualification_flows
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete flows
CREATE POLICY "Admins can delete qualification flows"
ON public.project_qualification_flows
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add update trigger
CREATE TRIGGER update_project_qualification_flows_updated_at
BEFORE UPDATE ON public.project_qualification_flows
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for project_id lookups
CREATE INDEX idx_project_qualification_flows_project_id 
ON public.project_qualification_flows(project_id);

-- Create index for created_at (for analytics)
CREATE INDEX idx_project_qualification_flows_created_at 
ON public.project_qualification_flows(created_at DESC);