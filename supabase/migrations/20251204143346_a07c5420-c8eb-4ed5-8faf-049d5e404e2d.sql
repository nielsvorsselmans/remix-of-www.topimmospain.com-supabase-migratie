-- Create project_contacts table for managing contact persons per project
CREATE TABLE public.project_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  phone TEXT,
  email TEXT,
  whatsapp TEXT,
  notes TEXT,
  is_primary BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup per project
CREATE INDEX idx_project_contacts_project ON public.project_contacts(project_id);
CREATE INDEX idx_project_contacts_active ON public.project_contacts(project_id, active);

-- Enable RLS
ALTER TABLE public.project_contacts ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage project contacts"
ON public.project_contacts
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active project contacts"
ON public.project_contacts
FOR SELECT
USING (active = true);

-- Trigger for updated_at
CREATE TRIGGER update_project_contacts_updated_at
BEFORE UPDATE ON public.project_contacts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();