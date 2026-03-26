-- Table for caching GHL notes with bidirectional sync
CREATE TABLE public.ghl_contact_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  crm_lead_id UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  ghl_note_id TEXT,
  body TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'admin_portal' CHECK (source IN ('ghl', 'admin_portal')),
  ghl_date_added TIMESTAMP WITH TIME ZONE,
  synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for caching GHL appointments with local notes
CREATE TABLE public.ghl_contact_appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  crm_lead_id UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  ghl_appointment_id TEXT NOT NULL UNIQUE,
  title TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT,
  calendar_id TEXT,
  local_notes TEXT,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ghl_contact_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ghl_contact_appointments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ghl_contact_notes
CREATE POLICY "Admins can manage GHL notes"
ON public.ghl_contact_notes
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage GHL notes"
ON public.ghl_contact_notes
FOR ALL
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- RLS Policies for ghl_contact_appointments
CREATE POLICY "Admins can manage GHL appointments"
ON public.ghl_contact_appointments
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage GHL appointments"
ON public.ghl_contact_appointments
FOR ALL
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Indexes
CREATE INDEX idx_ghl_notes_crm_lead ON public.ghl_contact_notes(crm_lead_id);
CREATE INDEX idx_ghl_notes_ghl_id ON public.ghl_contact_notes(ghl_note_id);
CREATE INDEX idx_ghl_appointments_crm_lead ON public.ghl_contact_appointments(crm_lead_id);
CREATE INDEX idx_ghl_appointments_start ON public.ghl_contact_appointments(start_time);

-- Trigger for updated_at
CREATE TRIGGER update_ghl_contact_notes_updated_at
BEFORE UPDATE ON public.ghl_contact_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ghl_contact_appointments_updated_at
BEFORE UPDATE ON public.ghl_contact_appointments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();