-- Create webinar_events table
CREATE TABLE public.webinar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  max_capacity INTEGER DEFAULT 100,
  current_registrations INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  webinar_url TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create webinar_registrations table
CREATE TABLE public.webinar_registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.webinar_events(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  confirmed BOOLEAN DEFAULT false,
  user_id UUID,
  crm_lead_id UUID REFERENCES public.crm_leads(id),
  visitor_id TEXT,
  registration_source TEXT DEFAULT 'website',
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.webinar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webinar_registrations ENABLE ROW LEVEL SECURITY;

-- RLS policies for webinar_events
CREATE POLICY "Anyone can view active webinar events"
  ON public.webinar_events
  FOR SELECT
  USING (active = true);

CREATE POLICY "Admins can manage webinar events"
  ON public.webinar_events
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for webinar_registrations
CREATE POLICY "Anyone can insert webinar registrations"
  ON public.webinar_registrations
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view their own webinar registrations"
  ON public.webinar_registrations
  FOR SELECT
  USING (
    auth.uid() = user_id 
    OR email = (auth.jwt() ->> 'email')
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins can manage webinar registrations"
  ON public.webinar_registrations
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage webinar registrations"
  ON public.webinar_registrations
  FOR ALL
  USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Trigger to update current_registrations count
CREATE OR REPLACE FUNCTION public.update_webinar_registration_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.webinar_events
    SET current_registrations = current_registrations + 1,
        updated_at = now()
    WHERE id = NEW.event_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.webinar_events
    SET current_registrations = current_registrations - 1,
        updated_at = now()
    WHERE id = OLD.event_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER update_webinar_registration_count_trigger
  AFTER INSERT OR DELETE ON public.webinar_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_webinar_registration_count();

-- Insert initial webinar events for January 2025
INSERT INTO public.webinar_events (title, date, time, duration_minutes, max_capacity, description, webinar_url)
VALUES 
  ('Gratis Online Webinar: Investeren in Spaans Vastgoed', '2025-01-12', '19:30:00', 60, 100, 'Ontdek hoe je veilig en rendabel investeert in Spaans nieuwbouw vastgoed, vanuit je luie zetel.', NULL),
  ('Gratis Online Webinar: Investeren in Spaans Vastgoed', '2025-01-26', '19:30:00', 60, 100, 'Ontdek hoe je veilig en rendabel investeert in Spaans nieuwbouw vastgoed, vanuit je luie zetel.', NULL);