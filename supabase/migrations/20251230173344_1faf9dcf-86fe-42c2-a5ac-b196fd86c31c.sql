-- Create team_members table
CREATE TABLE public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  bio TEXT NOT NULL,
  image_url TEXT,
  email TEXT,
  phone TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  show_on_about_page BOOLEAN NOT NULL DEFAULT true,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create event_team_members linking table
CREATE TABLE public.event_team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.info_evening_events(id) ON DELETE CASCADE,
  team_member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, team_member_id)
);

-- Enable RLS
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_team_members ENABLE ROW LEVEL SECURITY;

-- RLS policies for team_members
CREATE POLICY "Anyone can view active team members"
ON public.team_members
FOR SELECT
USING (active = true);

CREATE POLICY "Admins can manage team members"
ON public.team_members
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for event_team_members
CREATE POLICY "Anyone can view event team members"
ON public.event_team_members
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage event team members"
ON public.event_team_members
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create updated_at trigger for team_members
CREATE TRIGGER update_team_members_updated_at
BEFORE UPDATE ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial team data (Lars, Niels, Filip)
INSERT INTO public.team_members (name, role, bio, image_url, order_index) VALUES
('Lars', 'Jouw aanspreekpunt', 'Jouw eerste aanspreekpunt. Lars begeleidt je van eerste gesprek tot sleuteloverdracht - en blijft daarna beschikbaar voor al je vragen.', '/assets/lars-profile.webp', 0),
('Niels', 'Analyse & Cijfers', 'Duikt in de cijfers. Niels analyseert elk project op rendement, risico en marktpotentie voordat we het aanbieden.', '/assets/niels-profile.jpg', 1),
('Filip', 'Praktische Organisatie', 'Regelt de praktijk. Van bezichtigingsreizen tot sleuteloverdracht en contact met ontwikkelaars - Filip zorgt dat alles loopt.', '/assets/filip-profile.jpg', 2);