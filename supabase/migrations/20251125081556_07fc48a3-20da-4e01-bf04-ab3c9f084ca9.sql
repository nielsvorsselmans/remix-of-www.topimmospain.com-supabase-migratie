-- Create chatbot_settings table
CREATE TABLE IF NOT EXISTS public.chatbot_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key text NOT NULL UNIQUE,
  enabled boolean NOT NULL DEFAULT true,
  display_name text NOT NULL,
  description text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chatbot_settings ENABLE ROW LEVEL SECURITY;

-- Admins can manage chatbot settings
CREATE POLICY "Admins can manage chatbot settings"
  ON public.chatbot_settings
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can read settings
CREATE POLICY "Service role can read chatbot settings"
  ON public.chatbot_settings
  FOR SELECT
  USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_chatbot_settings_updated_at
  BEFORE UPDATE ON public.chatbot_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default chatbot flow settings
INSERT INTO public.chatbot_settings (setting_key, enabled, display_name, description, order_index) VALUES
  ('flow_account_creation', true, 'Account Aanmaak Flow', 'Begeleidt niet-ingelogde bezoekers naar account aanmaken om volledige data te zien', 1),
  ('flow_lead_qualification', false, 'Lead Kwalificatie Flow', 'AI-gestuurde vragen om voorkeuren te verzamelen en leads te kwalificeren', 2),
  ('flow_project_matching', false, 'Project Matching Flow', 'Toont alternatieve projecten wanneer budget niet past bij het huidige project', 3),
  ('flow_call_booking', false, 'Gesprek Inplannen Flow', 'Mogelijkheid voor gebruikers om een videogesprek in te plannen via Google Calendar', 4);