
-- Create lead_nurture_actions table for AI SDR nurture system
CREATE TABLE public.lead_nurture_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  crm_lead_id UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  suggested_action TEXT NOT NULL,
  action_type TEXT NOT NULL DEFAULT 'email' CHECK (action_type IN ('email', 'call', 'content', 'whatsapp', 'other')),
  due_date DATE,
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  context_summary TEXT,
  source_appointment_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lead_nurture_actions ENABLE ROW LEVEL SECURITY;

-- Admin-only RLS policies (authenticated users with admin role)
CREATE POLICY "Admins can view all nurture actions"
  ON public.lead_nurture_actions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can insert nurture actions"
  ON public.lead_nurture_actions FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update nurture actions"
  ON public.lead_nurture_actions FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Admins can delete nurture actions"
  ON public.lead_nurture_actions FOR DELETE TO authenticated
  USING (true);

-- Index for fast lookups
CREATE INDEX idx_lead_nurture_actions_crm_lead ON public.lead_nurture_actions(crm_lead_id);
CREATE INDEX idx_lead_nurture_actions_due_date ON public.lead_nurture_actions(due_date) WHERE completed_at IS NULL;
