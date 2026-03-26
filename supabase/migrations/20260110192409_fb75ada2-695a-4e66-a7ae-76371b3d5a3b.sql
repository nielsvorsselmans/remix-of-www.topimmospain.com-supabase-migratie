-- Create content_archetypes table for dynamic archetype management
CREATE TABLE public.content_archetypes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  icon text NOT NULL,
  description text,
  prompt_key text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  classification_rules jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.content_archetypes ENABLE ROW LEVEL SECURITY;

-- Public read access (archetypes are configuration data)
CREATE POLICY "Archetypes are publicly readable"
ON public.content_archetypes
FOR SELECT
USING (true);

-- Insert initial archetypes with classification rules
INSERT INTO public.content_archetypes (key, label, icon, description, prompt_key, sort_order, classification_rules) VALUES
(
  'lead_magnet',
  'Lead Magnet',
  '🧲',
  'Educatieve content die complexe onderwerpen uitlegt. Ideaal voor juridische, financiële en fiscale thema''s.',
  'content_lead_magnet',
  1,
  '{"themes": ["JURIDISCH", "FINANCIEEL", "BELASTING", "FISCAAL"], "keywords": ["hoe werkt", "regels", "kosten", "proces", "berekening", "wet", "procedure"], "insight_types": ["vraag", "behoefte", "verwarring"]}'::jsonb
),
(
  'hot_take',
  'Hot Take',
  '🌶️',
  'Mythbusting content die angsten en vooroordelen adresseert. Perfect voor het ontkrachten van mythen.',
  'content_hot_take',
  2,
  '{"themes": ["JURIDISCH", "FINANCIEEL", "LOCATIE"], "keywords": ["angst", "mythe", "bang", "hoor dat", "iedereen zegt", "risico", "gevaarlijk", "krakers", "onzekerheid"], "insight_types": ["angst", "weerstand", "mythe"]}'::jsonb
),
(
  'authority',
  'Authority & Lesson',
  '🧠',
  'Vertrouwensopbouwende content over emotie, proces en begeleiding. Voor het tonen van expertise en empathie.',
  'content_authority',
  3,
  '{"themes": ["EMOTIE", "PROCES", "VERHUUR", "VERTROUWEN"], "keywords": ["spannend", "gevoel", "twijfel", "partner", "te mooi", "vertrouwen", "begeleiding", "onzeker"], "insight_types": ["emotie", "twijfel", "bezorgdheid"]}'::jsonb
);

-- Create updated_at trigger
CREATE TRIGGER update_content_archetypes_updated_at
BEFORE UPDATE ON public.content_archetypes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();