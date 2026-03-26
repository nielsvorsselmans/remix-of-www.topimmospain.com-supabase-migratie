-- Add documentation column to chatbot_agent_tools
ALTER TABLE public.chatbot_agent_tools
ADD COLUMN IF NOT EXISTS documentation jsonb DEFAULT '{}'::jsonb;

-- Update flow_lead_qualification documentation to reflect new hybrid architecture
UPDATE public.chatbot_settings
SET documentation = jsonb_build_object(
  'full_description', 'Gestructureerde flow die essentiële voorkeuren verzamelt via vaste vragen. Na 80% compleetheid schakelt de chatbot automatisch naar AI Agent mode waar de AI toegang krijgt tot tools zoals projecten voorstellen en videocalls inplannen.',
  'triggers', jsonb_build_array(
    'Gebruiker is ingelogd',
    'Kwalificatie score < 80%'
  ),
  'preconditions', jsonb_build_array(
    'Gebruiker is geauthenticeerd',
    'flow_account_creation voltooid (indien voorheen niet ingelogd)'
  ),
  'dependencies', jsonb_build_array(
    'chatbot_agent_tools tabel (voor transitie naar Agent mode)'
  ),
  'steps', jsonb_build_array(
    jsonb_build_object('number', 1, 'description', 'Check user_preferences tabel voor bestaande data'),
    jsonb_build_object('number', 2, 'description', 'Vraag budget range (budget_min, budget_max) indien niet bekend'),
    jsonb_build_object('number', 3, 'description', 'Vraag regio voorkeuren (preferred_regions) indien niet bekend'),
    jsonb_build_object('number', 4, 'description', 'Vraag investeringsdoel (investment_goal: huur/waardestijging/combinatie) indien niet bekend'),
    jsonb_build_object('number', 5, 'description', 'Vraag tijdlijn (timeline) indien niet bekend'),
    jsonb_build_object('number', 6, 'description', 'Bereken data_completeness_score'),
    jsonb_build_object('number', 7, 'description', 'Bij ≥80% compleet → Automatische transitie naar AI Agent Mode')
  ),
  'warning_notes', jsonb_build_array(
    'Vragen worden NIET herhaald als data al bekend is',
    'AI Agent mode wordt pas geactiveerd bij ≥80% kwalificatie',
    'Uitschakelen van deze flow blokkeert ook toegang tot AI Agent tools'
  )
)
WHERE setting_key = 'flow_lead_qualification';

-- Update flow_account_creation documentation
UPDATE public.chatbot_settings
SET documentation = jsonb_build_object(
  'full_description', 'Begeleidt niet-ingelogde bezoekers naar registratie of login. Na succesvolle authenticatie start automatisch de Lead Kwalificatie flow.',
  'triggers', jsonb_build_array(
    'Gebruiker opent chatbot zonder actieve sessie',
    'Gebruiker probeert blurred rental data te bekijken'
  ),
  'preconditions', jsonb_build_array(
    'Gebruiker is NIET ingelogd'
  ),
  'dependencies', jsonb_build_array(
    'flow_lead_qualification (start na succesvolle registratie)'
  ),
  'steps', jsonb_build_array(
    jsonb_build_object('number', 1, 'description', 'Toon welkomstbericht met signup/login tabs'),
    jsonb_build_object('number', 2, 'description', 'Signup tab: voornaam, achternaam, email, wachtwoord'),
    jsonb_build_object('number', 3, 'description', 'Login tab: email, wachtwoord'),
    jsonb_build_object('number', 4, 'description', 'Na authenticatie → Start flow_lead_qualification automatisch')
  ),
  'warning_notes', jsonb_build_array(
    'Uitschakelen blokkeert ALL chatbot functionaliteit voor niet-ingelogde users',
    'Lead role wordt automatisch toegekend bij registratie'
  )
)
WHERE setting_key = 'flow_account_creation';

-- Update flow_project_matching to indicate it's now an AI Agent Tool
UPDATE public.chatbot_settings
SET documentation = jsonb_build_object(
  'full_description', '⚠️ DEPRECATED: Deze functionaliteit is nu een AI Agent Tool (suggest_matching_projects). De AI beslist automatisch wanneer projecten voorgesteld moeten worden op basis van context.',
  'triggers', jsonb_build_array(
    'Deze flow wordt niet meer direct getriggerd',
    'Functionaliteit beschikbaar via AI Agent na kwalificatie'
  ),
  'preconditions', jsonb_build_array(
    'N/A - Zie chatbot_agent_tools tabel'
  ),
  'dependencies', jsonb_build_array(
    'chatbot_agent_tools: suggest_matching_projects'
  ),
  'steps', jsonb_build_array(
    jsonb_build_object('number', 1, 'description', 'Zie AI Agent Tool documentatie')
  ),
  'warning_notes', jsonb_build_array(
    'Deze setting heeft geen effect meer',
    'Schakel suggest_matching_projects tool in/uit in chatbot_agent_tools tabel'
  )
)
WHERE setting_key = 'flow_project_matching';

-- Update flow_call_booking to indicate it's now an AI Agent Tool
UPDATE public.chatbot_settings
SET documentation = jsonb_build_object(
  'full_description', '⚠️ DEPRECATED: Deze functionaliteit is nu een AI Agent Tool (schedule_video_call). De AI beslist automatisch wanneer een videocall voorgesteld moet worden op basis van context en interesse niveau.',
  'triggers', jsonb_build_array(
    'Deze flow wordt niet meer direct getriggerd',
    'Functionaliteit beschikbaar via AI Agent na kwalificatie'
  ),
  'preconditions', jsonb_build_array(
    'N/A - Zie chatbot_agent_tools tabel'
  ),
  'dependencies', jsonb_build_array(
    'chatbot_agent_tools: schedule_video_call'
  ),
  'steps', jsonb_build_array(
    jsonb_build_object('number', 1, 'description', 'Zie AI Agent Tool documentatie')
  ),
  'warning_notes', jsonb_build_array(
    'Deze setting heeft geen effect meer',
    'Schakel schedule_video_call tool in/uit in chatbot_agent_tools tabel'
  )
)
WHERE setting_key = 'flow_call_booking';

-- Add documentation to suggest_matching_projects tool
UPDATE public.chatbot_agent_tools
SET documentation = jsonb_build_object(
  'full_description', 'AI tool die projecten zoekt en voorstelt op basis van gekwalificeerde gebruikersvoorkeuren. Gebruikt find-matching-projects edge function om matches te berekenen op budget, regio, en slaapkamers.',
  'triggers', jsonb_build_array(
    'Budget van gebruiker matcht niet met huidig bekeken project',
    'Gebruiker vraagt expliciet om vergelijking of alternatieven',
    'AI detecteert behoefte aan meer opties',
    'Na "Wil dit vergelijken met andere opties" project opinion'
  ),
  'preconditions', jsonb_build_array(
    'Lead kwalificatie ≥80% compleet',
    'budget_min en budget_max bekend in user_preferences',
    'preferred_regions bekend in user_preferences'
  ),
  'output_format', 'Visual project cards in chat met featured image, naam, locatie, prijs range, en "Bekijk Details" knop',
  'edge_function', 'find-matching-projects',
  'parameters', jsonb_build_object(
    'limit', jsonb_build_object('type', 'number', 'default', 3, 'description', 'Aantal projecten om voor te stellen'),
    'budget_min', jsonb_build_object('type', 'number', 'source', 'user_preferences'),
    'budget_max', jsonb_build_object('type', 'number', 'source', 'user_preferences'),
    'regions', jsonb_build_object('type', 'array', 'source', 'user_preferences')
  ),
  'fallback_behavior', 'Bij geen matches: AI verklaart waarom en vraagt of gebruiker budget/regio wil aanpassen'
)
WHERE name = 'suggest_matching_projects';

-- Add documentation to schedule_video_call tool
UPDATE public.chatbot_agent_tools
SET documentation = jsonb_build_object(
  'full_description', 'Plant een 30-minuten videocall in met het Viva Vastgoed team via Google Calendar integratie. Haalt beschikbare tijdslots op en creëert afspraak in GoHighLevel CRM.',
  'triggers', jsonb_build_array(
    'Sterke interesse getoond ("😍 Super interessant!" opinion)',
    'Na het tonen van matching projecten',
    'Directe vraag om gesprek of persoonlijk advies',
    'AI detecteert hoge engagement en koopintentie'
  ),
  'preconditions', jsonb_build_array(
    'Lead kwalificatie ≥80% compleet',
    'Gebruiker heeft interesse getoond in ≥1 project'
  ),
  'output_format', 'Calendar booking interface met beschikbare tijdslots (weekdays 9:30-11:00, 17:00-21:00, Saturday 10:00-14:00)',
  'edge_function', 'create-ghl-appointment',
  'parameters', jsonb_build_object(
    'reason', jsonb_build_object('type', 'string', 'description', 'Reden voor gesprek (bijv. project interesse)'),
    'preferred_time', jsonb_build_object('type', 'string', 'optional', true, 'description', 'Optionele voorkeur tijdstip'),
    'phone_number', jsonb_build_object('type', 'string', 'optional', true, 'description', 'Wordt gevraagd als niet bekend')
  ),
  'fallback_behavior', 'Bij decline: Biedt alternatieve engagement (email updates, portal access, callback request)'
)
WHERE name = 'schedule_video_call';

-- Add documentation to answer_question tool
UPDATE public.chatbot_agent_tools
SET documentation = jsonb_build_object(
  'full_description', 'Beantwoordt specifieke vragen over vastgoed in Spanje, investeringsprocessen, projecten, kosten, of andere gerelateerde onderwerpen. Gebruikt Lovable AI met context over project en gebruikersdata.',
  'triggers', jsonb_build_array(
    'Directe vraag gesteld door gebruiker',
    'Onduidelijkheid over proces of kosten',
    'Geen andere tool past bij de gebruikersinput',
    'Behoefte aan verduidelijking na tool resultaat'
  ),
  'preconditions', jsonb_build_array(
    'Lead kwalificatie ≥80% compleet (hoewel tool ook eerder gebruikt kan worden voor algemene vragen)'
  ),
  'output_format', 'Conversational antwoord van AI in chat, kan follow-up vragen bevatten',
  'edge_function', 'Gebruikt Lovable AI direct (geen aparte edge function)',
  'parameters', jsonb_build_object(
    'question', jsonb_build_object('type', 'string', 'description', 'De vraag van de gebruiker'),
    'context', jsonb_build_object('type', 'string', 'optional', true, 'description', 'Project ID of andere relevante context')
  ),
  'fallback_behavior', 'Als vraag te specifiek: Verwijst naar videocall of email contact voor gedetailleerd antwoord'
)
WHERE name = 'answer_question';