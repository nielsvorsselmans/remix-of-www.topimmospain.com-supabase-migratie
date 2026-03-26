-- Add documentation column to chatbot_settings table
ALTER TABLE public.chatbot_settings 
ADD COLUMN IF NOT EXISTS documentation jsonb DEFAULT '{}'::jsonb;

-- Update existing rows with detailed documentation
UPDATE public.chatbot_settings
SET documentation = jsonb_build_object(
  'full_description', 'Begeleidt niet-ingelogde bezoekers door een conversatie die eindigt met account aanmaken om volledige data (zoals verhuuranalyses en kostenberekeningen) te kunnen bekijken.',
  'triggers', ARRAY['Niet-ingelogde gebruiker opent project pagina', 'Chatbot wordt gestart zonder authenticatie']::text[],
  'preconditions', ARRAY['Gebruiker moet niet ingelogd zijn']::text[],
  'dependencies', ARRAY['flow_lead_qualification']::text[],
  'steps', jsonb_build_array(
    jsonb_build_object('order', 1, 'description', 'Vraag over gebruik type', 'options', ARRAY['Investering', 'Eigen gebruik', 'Combinatie']::text[]),
    jsonb_build_object('order', 2, 'description', 'Vraag of gebruiker volledige overzicht wil ontvangen'),
    jsonb_build_object('order', 3, 'description', 'Toon signup/login tabbed formulier'),
    jsonb_build_object('order', 4, 'description', 'Na authenticatie: Start Lead Kwalificatie Flow (indien enabled)')
  ),
  'warning_notes', ARRAY['Deze flow moet actief blijven voor lead capturing', 'Lead Kwalificatie Flow wordt automatisch gestart NA deze flow']::text[]
)
WHERE setting_key = 'flow_account_creation';

UPDATE public.chatbot_settings
SET documentation = jsonb_build_object(
  'full_description', 'AI-gestuurde conversatie die voorkeuren verzamelt van ingelogde gebruikers (budget, regio, timeline, ervaring) om leads te kwalificeren en gepersonaliseerde aanbevelingen te doen.',
  'triggers', ARRAY['Ingelogde gebruiker na account aanmaak', 'Ingelogde gebruiker bezoekt project pagina', 'Na voltooiing Account Aanmaak Flow']::text[],
  'preconditions', ARRAY['Gebruiker moet ingelogd zijn', 'User preferences record moet bestaan']::text[],
  'dependencies', ARRAY['flow_project_matching', 'flow_call_booking']::text[],
  'steps', jsonb_build_array(
    jsonb_build_object('order', 1, 'description', 'Welkomstbericht met project context'),
    jsonb_build_object('order', 2, 'description', 'AI vraagt om project mening', 'options', ARRAY['Super interessant', 'Ziet er goed uit', 'Wil vergelijken', 'Heb vragen', 'Nog aan het oriënteren']::text[]),
    jsonb_build_object('order', 3, 'description', 'Verzamel budget range (dynamisch gegenereerd per project)'),
    jsonb_build_object('order', 4, 'description', 'Verzamel regio voorkeuren', 'options', ARRAY['Costa Cálida', 'Costa Blanca Zuid', 'Costa Blanca Noord', 'Andere']::text[]),
    jsonb_build_object('order', 5, 'description', 'AI stelt contextuele verdiepingsvragen op basis van antwoorden'),
    jsonb_build_object('order', 6, 'description', 'Biedt opties: Zoek matches, Plan gesprek, Meer vragen')
  ),
  'warning_notes', ARRAY['3-laags geheugen systeem: 10 laatste berichten + viewed_project_ids + conversation history', 'AI past strategie aan op basis van eerdere interacties', 'Bij budget mismatch wordt Project Matching Flow getriggerd']::text[]
)
WHERE setting_key = 'flow_lead_qualification';

UPDATE public.chatbot_settings
SET documentation = jsonb_build_object(
  'full_description', 'Zoekt en toont alternatieve projecten die beter passen bij het budget en voorkeuren van de gebruiker wanneer het huidige project niet matcht.',
  'triggers', ARRAY['Budget mismatch met huidige project', 'Gebruiker kiest "Wil dit vergelijken met andere opties"', 'AI detecteert dat huidige project niet past']::text[],
  'preconditions', ARRAY['flow_lead_qualification moet enabled zijn', 'Budget range moet bekend zijn in user_preferences', 'Regio voorkeur moet bekend zijn']::text[],
  'dependencies', ARRAY[]::text[],
  'steps', jsonb_build_array(
    jsonb_build_object('order', 1, 'description', 'AI roept find-matching-projects edge function aan'),
    jsonb_build_object('order', 2, 'description', 'Toon tot 3 matching project cards met afbeeldingen'),
    jsonb_build_object('order', 3, 'description', 'Gebruiker kan project details bekijken (opent in nieuwe tab)'),
    jsonb_build_object('order', 4, 'description', 'Conversatie blijft actief via sessionStorage persistence'),
    jsonb_build_object('order', 5, 'description', 'Vraag: Wil je deze bekijken of gesprek plannen?')
  ),
  'warning_notes', ARRAY['Matching gebeurt op basis van budget_min/max + regio + bedrooms', 'Project cards blijven zichtbaar in chat geschiedenis', 'Conversatie blijft actief tijdens navigatie tussen projecten']::text[]
)
WHERE setting_key = 'flow_project_matching';

UPDATE public.chatbot_settings
SET documentation = jsonb_build_object(
  'full_description', 'Begeleidt gebruikers naar het inplannen van een 30-minuten videogesprek met het sales team via Google Calendar integratie.',
  'triggers', ARRAY['Na matches getoond', 'Gebruiker kiest "Plan een gesprek"', 'AI biedt gesprek aan na beantwoorden vragen', 'Na "Super interessant!" project mening']::text[],
  'preconditions', ARRAY['flow_lead_qualification moet enabled zijn', 'Gebruiker moet ingelogd zijn', 'Google Calendar moet geconfigureerd zijn']::text[],
  'dependencies', ARRAY[]::text[],
  'steps', jsonb_build_array(
    jsonb_build_object('order', 1, 'description', 'Vraag om telefoonnummer voor videocall'),
    jsonb_build_object('order', 2, 'description', 'Toon beschikbare tijdslots via create-ghl-appointment edge function'),
    jsonb_build_object('order', 3, 'description', 'Gebruiker selecteert voorkeur tijden', 'options', ARRAY['Maandag-Vrijdag ochtend (9:30-11:00)', 'Maandag-Vrijdag avond (17:00-21:00)', 'Zaterdag middag (10:00-14:00)']::text[]),
    jsonb_build_object('order', 4, 'description', 'Bevestiging gesprek ingepland'),
    jsonb_build_object('order', 5, 'description', 'Data opgeslagen in conversation metadata')
  ),
  'warning_notes', ARRAY['Google Calendar beschikbaarheid: Ma-Vr 9:30-11:00 + 17:00-21:00, Za 10:00-14:00', 'Bij decline: biedt alternatieve engagement opties', 'Telefoonnummer wordt opgeslagen in user_preferences']::text[]
)
WHERE setting_key = 'flow_call_booking';