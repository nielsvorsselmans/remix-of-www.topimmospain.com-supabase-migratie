-- Create content_tensions table for the Tension Library
CREATE TABLE public.content_tensions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  tension_title TEXT NOT NULL,
  old_belief TEXT NOT NULL,
  new_reality TEXT NOT NULL,
  emotional_undercurrent TEXT NOT NULL,
  hook_angle TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.content_tensions ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone authenticated can read active tensions
CREATE POLICY "Authenticated users can read active tensions"
ON public.content_tensions
FOR SELECT
USING (auth.role() = 'authenticated' AND is_active = true);

-- Policy: Admins can manage all tensions (for now, all authenticated users)
CREATE POLICY "Authenticated users can manage tensions"
ON public.content_tensions
FOR ALL
USING (auth.role() = 'authenticated');

-- Create updated_at trigger
CREATE TRIGGER update_content_tensions_updated_at
BEFORE UPDATE ON public.content_tensions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed the initial 6 tensions
INSERT INTO public.content_tensions (category, tension_title, old_belief, new_reality, emotional_undercurrent, hook_angle) VALUES
(
  'HARD WERKEN VS. LATEN WERKEN',
  'Inkomen vs. Vermogen',
  'Als ik maar hard genoeg werk en omzet draai, ben ik veilig.',
  'Je hebt geen inkomensprobleem, je hebt een allocatieprobleem.',
  'Vermoeidheid en leegte: ''Ik ren in een hamsterwiel en bouw niets blijvends op.''',
  'Waarom meer omzet je geen rust gaat geven.'
),
(
  'SYSTEEM VS. INDIVIDU',
  'Loyaliteit vs. Straf',
  'Als ik netjes meedoe en belasting betaal, zorgt het systeem voor mij.',
  'Succes wordt belast en bezit wordt ontmoedigd. Loyaliteit kost je geld.',
  'Onrechtvaardigheidsgevoel en teleurstelling: ''Ik heb me aan de regels gehouden, maar de regels zijn tegen mij gekeerd.''',
  'Waarom de loyale burger de grootste verliezer is.'
),
(
  'NU VS. STRAKS',
  'Wachten vs. Missen',
  'Ik wacht wel tot het perfecte moment / de markt afkoelt.',
  'Tijd in de markt verslaat het timen van de markt. Wachten is speculeren.',
  'Knagende onrust: De angst dat je de boot mist terwijl ''minder slimme'' mensen wel stappen zetten.',
  'De kosten van niets doen zijn hoger dan je denkt.'
),
(
  'VEILIGHEID VS. CONTROLE',
  'Dichtbij vs. Verweg',
  'Ik koop liever in de buurt, dan kan ik er langsrijden (schijncontrole).',
  'Controle zit niet in afstand, maar in de kwaliteit van je team en de asset.',
  'Controleverlies en wantrouwen: ''Ik durf het niet los te laten omdat ik niemand vertrouw.''',
  'Waarom ''zichtbaarheid'' een valse vorm van veiligheid is.'
),
(
  'CALVINISME VS. LEVENSKUNST',
  'Nut vs. Genot',
  'Elke euro moet renderen in Excel. Genieten is ''zonde''.',
  'Het hoogste rendement is tijd met familie. Geld is slechts brandstof voor herinneringen.',
  'Schuldgevoel vs. Verlangen: ''Mag ik wel genieten van mijn eigen succes?''',
  'Stop met rekenen, begin met leven (maar doe het slim).'
),
(
  'BEZIT VS. LAST',
  'DIY vs. Who',
  'Ik doe het zelf wel, dan gebeurt het tenminste goed.',
  'Jouw uurtarief is te hoog om aannemer te spelen. Je koopt jezelf een baan erbij.',
  'Overbelasting en frustratie: ''Ik wil vrijheid, maar ik heb mezelf alleen maar meer werk gegeven.''',
  'Waarom zelf managen je duurste hobby is.'
);