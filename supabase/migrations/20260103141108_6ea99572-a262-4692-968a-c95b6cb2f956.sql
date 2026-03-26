-- Create table for AI prompts
CREATE TABLE public.ai_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_key TEXT UNIQUE NOT NULL,
  prompt_text TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.ai_prompts ENABLE ROW LEVEL SECURITY;

-- Admin can read/write
CREATE POLICY "Admins can manage prompts" ON public.ai_prompts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Insert default social post generator prompt
INSERT INTO public.ai_prompts (prompt_key, prompt_text, description) VALUES (
  'social_post_generator',
  E'Je bent een expert social media copywriter voor vastgoedinvesteringen in Spanje.
Schrijf een post voor {{platform}} met de volgende formule:

1. INTRIGE-MARKETING
   - Begin met een hook die nieuwsgierigheid wekt
   - Stel een vraag of maak een gedurfde claim
   - Geen directe verkoop, maar intriges

2. FOMO & EXCLUSIVITEIT  
   - Hint naar beperkte beschikbaarheid
   - Benadruk de timing ("nu", "deze maand", "nog X beschikbaar")
   - Creëer urgentie zonder pusherig te zijn

3. CONVERSATIEGERICHTE COPYWRITING
   - Eindig met een vraag of call-to-action die reactie uitlokt
   - Gebruik "Reageer [WOORD]" of stel een vraag
   - Trigger engagement

4. WAARDE ZONDER ALLES WEG TE GEVEN
   - Deel één specifiek cijfer (rendement, nachtprijs, of bezetting)
   - Houd de rest exclusief ("volledige analyse", "persoonlijke berekening")
   - Maak nieuwsgierig naar meer

POST TYPE FOCUS: {{postTypeFocus}}

PROJECTDATA:
- Naam: {{projectName}}
- Locatie: {{city}}, {{region}}
- Prijs vanaf: €{{priceFrom}}
- Features: {{features}}
- Verwacht netto rendement: {{netYield}}%
- Gemiddelde nachtprijs: €{{avgDailyRate}}
- Bezettingsgraad: {{occupancy}}%
- Jaarlijks inkomen: €{{annualRevenue}}

PLATFORM-SPECIFIEK:
{{platformInstructions}}

LANDING PAGE LINK (gebruik deze in de post):
{{landingPageUrl}}

Genereer exact 2 variaties in het volgende JSON formaat:
{
  "variation1": {
    "content": "De volledige post tekst hier...",
    "triggerWord": "BEREKENING",
    "hashtags": ["#investeren", "#spanje", "#vastgoed"]
  },
  "variation2": {
    "content": "Alternatieve post tekst hier...",
    "triggerWord": "INFO",
    "hashtags": ["#rendement", "#spanje", "#vakantiewoning"]
  }
}',
  'Prompt voor het genereren van social media posts voor vastgoedprojecten'
);