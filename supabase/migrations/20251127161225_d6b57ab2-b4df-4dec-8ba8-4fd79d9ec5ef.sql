-- Add new AI agent tool for account creation prompting
INSERT INTO public.chatbot_agent_tools (
  name,
  display_name,
  description,
  is_enabled,
  order_priority,
  parameters_schema,
  requires_data,
  documentation
) VALUES (
  'prompt_account_creation',
  'Account Aanmaak Prompt',
  'Toont inline signup formulier aan engaged anonieme bezoekers',
  true,
  4,
  '{"type": "object", "properties": {"engagement_level": {"type": "string", "description": "Engagement niveau van de bezoeker"}, "context": {"type": "string", "description": "Context waarom account aanmaak wordt voorgesteld"}}, "required": ["engagement_level", "context"]}'::jsonb,
  '["visitor_preferences", "page_views"]'::jsonb,
  '{
    "full_description": "Deze tool toont een inline signup formulier aan anonieme bezoekers die voldoende engagement tonen. Het formulier verschijnt direct in de chat, waardoor de bezoeker naadloos kan registreren zonder context te verliezen.",
    "triggers": [
      "Anonieme bezoeker heeft 3+ projecten bekeken",
      "Anonieme bezoeker vraagt naar exclusieve data (verhuurcijfers, kostenanalyse)",
      "Anonieme bezoeker toont interesse in matching projecten",
      "Bezoeker wil projecten opslaan of vergelijken"
    ],
    "preconditions": [
      "Bezoeker is NIET ingelogd",
      "Bezoeker heeft voldoende engagement (2+ minuten op site OF 2+ paginas bekeken)",
      "Bezoeker heeft nog GEEN account"
    ],
    "dependencies": [],
    "steps": [
      {
        "step": 1,
        "description": "AI detecteert dat anonieme bezoeker geïnteresseerd is in premium features"
      },
      {
        "step": 2,
        "description": "AI stelt account aanmaak voor met concrete voordelen (exclusieve data, matches, favorieten)"
      },
      {
        "step": 3,
        "description": "Frontend toont inline signup formulier binnen chat window"
      },
      {
        "step": 4,
        "description": "Na succesvolle registratie: automatische merge van visitor data naar user account"
      },
      {
        "step": 5,
        "description": "Gesprek gaat door met nu ingelogde gebruiker, focus shift naar lead qualification"
      }
    ],
    "fallback_behavior": "Als account aanmaak wordt uitgesteld, biedt AI alternatieve waarde (blog articles, customer stories) en probeert later opnieuw.",
    "warning_notes": "KRITIEK: Gebruik ALLEEN voor engaged bezoekers. Te vroeg vragen schaadt vertrouwen. Wacht tot bezoeker zelf vraagt om premium features of duidelijk interesse toont."
  }'::jsonb
);