-- Create table for info evening events
CREATE TABLE public.info_evening_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  location_name TEXT NOT NULL,
  location_address TEXT NOT NULL,
  max_capacity INTEGER DEFAULT 50,
  current_registrations INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for registrations
CREATE TABLE public.info_evening_registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.info_evening_events(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  number_of_persons INTEGER DEFAULT 1,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  visitor_id TEXT,
  crm_lead_id UUID REFERENCES public.crm_leads(id),
  confirmed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.info_evening_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.info_evening_registrations ENABLE ROW LEVEL SECURITY;

-- RLS policies for events (public read, admin manage)
CREATE POLICY "Anyone can view active events"
  ON public.info_evening_events
  FOR SELECT
  USING (active = true);

CREATE POLICY "Admins can manage events"
  ON public.info_evening_events
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for registrations
CREATE POLICY "Anyone can register"
  ON public.info_evening_registrations
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view their own registrations"
  ON public.info_evening_registrations
  FOR SELECT
  USING (email = (auth.jwt() ->> 'email') OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage registrations"
  ON public.info_evening_registrations
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage registrations"
  ON public.info_evening_registrations
  FOR ALL
  USING ((auth.jwt() ->> 'role') = 'service_role');

-- Trigger to update registration count
CREATE OR REPLACE FUNCTION public.update_event_registration_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.info_evening_events
    SET current_registrations = current_registrations + NEW.number_of_persons,
        updated_at = now()
    WHERE id = NEW.event_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.info_evening_events
    SET current_registrations = current_registrations - OLD.number_of_persons,
        updated_at = now()
    WHERE id = OLD.event_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER update_registration_count
  AFTER INSERT OR DELETE ON public.info_evening_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_event_registration_count();

-- Insert initial events for February 2026
INSERT INTO public.info_evening_events (title, date, time, location_name, location_address) VALUES
  ('Infoavond Antwerpen', '2026-02-03', '19:00', 'Hotel Crowne Plaza', 'Gerard Le Grellelaan 10, 2020 Antwerpen'),
  ('Infoavond Gent', '2026-02-05', '19:00', 'Hotel Marriott', 'Korenlei 10, 9000 Gent'),
  ('Infoavond Brussel', '2026-02-10', '19:00', 'Hotel Steigenberger', 'Auguste Ortsstraat 3-7, 1000 Brussel'),
  ('Infoavond Rotterdam', '2026-02-12', '19:00', 'Hotel New York', 'Koninginnehoofd 1, 3072 AD Rotterdam'),
  ('Infoavond Amsterdam', '2026-02-17', '19:00', 'Hotel Okura', 'Ferdinand Bolstraat 333, 1072 LH Amsterdam'),
  ('Infoavond Utrecht', '2026-02-19', '19:00', 'Karel V Hotel', 'Geertebolwerk 1, 3511 XA Utrecht');