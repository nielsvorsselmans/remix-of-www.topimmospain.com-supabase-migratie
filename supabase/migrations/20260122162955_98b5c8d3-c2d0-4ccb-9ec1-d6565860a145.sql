-- Tabel voor opslag van project briefing analyses
CREATE TABLE public.project_briefing_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Stap 1: Brainstormer output
  brainstorm_insights TEXT,
  brainstorm_edited TEXT,
  brainstorm_approved_at TIMESTAMPTZ,
  
  -- Stap 2: Formalizer output (JSON)
  formalized_result JSONB,
  
  -- Metadata
  status TEXT DEFAULT 'brainstorm_pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Index voor snelle lookups
CREATE INDEX idx_briefing_analyses_project ON public.project_briefing_analyses(project_id);
CREATE INDEX idx_briefing_analyses_status ON public.project_briefing_analyses(status);

-- Enable RLS
ALTER TABLE public.project_briefing_analyses ENABLE ROW LEVEL SECURITY;

-- RLS policies - alleen admins kunnen analyses beheren (profiles.id = user_id)
CREATE POLICY "Admins can view all briefing analyses"
ON public.project_briefing_analyses FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.email IN (SELECT email FROM public.profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Admins can create briefing analyses"
ON public.project_briefing_analyses FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Admins can update briefing analyses"
ON public.project_briefing_analyses FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Admins can delete briefing analyses"
ON public.project_briefing_analyses FOR DELETE
TO authenticated
USING (true);

-- Trigger voor automatische updated_at
CREATE TRIGGER update_project_briefing_analyses_updated_at
BEFORE UPDATE ON public.project_briefing_analyses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();