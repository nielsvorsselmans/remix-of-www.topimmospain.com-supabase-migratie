-- Create chatbot_agent_tools table for AI Agent tools
CREATE TABLE public.chatbot_agent_tools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  requires_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  parameters_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  order_priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chatbot_agent_tools ENABLE ROW LEVEL SECURITY;

-- Admins can manage agent tools
CREATE POLICY "Admins can manage agent tools"
ON public.chatbot_agent_tools
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can read agent tools
CREATE POLICY "Service role can read agent tools"
ON public.chatbot_agent_tools
FOR SELECT
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_chatbot_agent_tools_updated_at
BEFORE UPDATE ON public.chatbot_agent_tools
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default agent tools
INSERT INTO public.chatbot_agent_tools (name, display_name, description, requires_data, parameters_schema, order_priority) VALUES
(
  'suggest_matching_projects',
  'Projecten Voorstellen',
  'Zoek en toon projecten die passen bij de voorkeuren van de gebruiker op basis van budget, regio, slaapkamers en andere criteria',
  '{"budget": true, "region": true}'::jsonb,
  '{
    "type": "object",
    "properties": {
      "limit": {"type": "number", "default": 3, "description": "Aantal projecten om te tonen"},
      "sort_by": {"type": "string", "enum": ["price", "match_score", "popularity"], "default": "match_score"}
    }
  }'::jsonb,
  1
),
(
  'schedule_video_call',
  'Videocall Inplannen',
  'Plan een 30-minuten videocall in met het Viva Vastgoed team om de investering verder te bespreken',
  '{"phone_number": false}'::jsonb,
  '{
    "type": "object",
    "properties": {
      "reason": {"type": "string", "description": "Reden voor de call"},
      "preferred_time": {"type": "string", "description": "Voorkeurstijd"}
    }
  }'::jsonb,
  2
),
(
  'answer_question',
  'Vraag Beantwoorden',
  'Beantwoord specifieke vragen over vastgoedbeleggingen, processen, financiering, of projecten',
  '{}'::jsonb,
  '{
    "type": "object",
    "properties": {
      "question": {"type": "string", "description": "De vraag van de gebruiker"},
      "context": {"type": "string", "description": "Relevante context zoals project ID"}
    },
    "required": ["question"]
  }'::jsonb,
  3
);