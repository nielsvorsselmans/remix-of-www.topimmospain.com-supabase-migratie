-- Step 1: Rename old tables to backup
ALTER TABLE IF EXISTS public.chat_sessions RENAME TO chat_sessions_old;
ALTER TABLE IF EXISTS public.chat_messages RENAME TO chat_messages_old;

-- Step 2: Create new flexible chat tables
CREATE TABLE public.chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id text NOT NULL,
  project_id text NOT NULL,
  bot_type text NOT NULL DEFAULT 'investment_advisor',
  converted boolean NOT NULL DEFAULT false,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('system', 'assistant', 'user')),
  content text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_chat_conversations_visitor ON public.chat_conversations(visitor_id);
CREATE INDEX idx_chat_conversations_project ON public.chat_conversations(project_id);
CREATE INDEX idx_chat_conversations_created ON public.chat_conversations(created_at DESC);
CREATE INDEX idx_chat_messages_conversation ON public.chat_messages(conversation_id);
CREATE INDEX idx_chat_messages_created ON public.chat_messages(created_at);

-- Enable RLS
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_conversations
CREATE POLICY "Authenticated users can read chat conversations"
  ON public.chat_conversations
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service role can manage chat conversations"
  ON public.chat_conversations
  FOR ALL
  USING ((auth.jwt() ->> 'role') = 'service_role');

-- RLS Policies for chat_messages
CREATE POLICY "Authenticated users can read chat messages"
  ON public.chat_messages
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service role can manage chat messages"
  ON public.chat_messages
  FOR ALL
  USING ((auth.jwt() ->> 'role') = 'service_role');

-- Step 3: Migrate existing data from old to new structure
INSERT INTO public.chat_conversations (id, visitor_id, project_id, converted, started_at, completed_at, metadata, created_at)
SELECT 
  id,
  visitor_id,
  project_id,
  converted,
  started_at,
  completed_at,
  jsonb_build_object(
    'usage_type', usage_type_choice,
    'email', final_email,
    'name', final_name
  ) || 
  CASE 
    WHEN usage_type_choice IS NULL AND final_email IS NULL AND final_name IS NULL 
    THEN '{}'::jsonb
    ELSE '{}'::jsonb
  END,
  created_at
FROM public.chat_sessions_old;

-- Migrate messages with role mapping
INSERT INTO public.chat_messages (id, conversation_id, role, content, metadata, created_at)
SELECT 
  m.id,
  m.session_id,
  CASE 
    WHEN m.message_type = 'assistant' THEN 'assistant'
    WHEN m.message_type = 'user' THEN 'user'
    ELSE 'user'
  END,
  m.content,
  jsonb_build_object('step', m.step),
  m.created_at
FROM public.chat_messages_old m
WHERE EXISTS (SELECT 1 FROM public.chat_conversations WHERE id = m.session_id);