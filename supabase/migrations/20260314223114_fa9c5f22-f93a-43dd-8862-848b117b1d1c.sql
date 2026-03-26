
-- Conversations table for copilot chat history
CREATE TABLE public.aftersales_copilot_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.aftersales_copilot_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage their own conversations"
  ON public.aftersales_copilot_conversations
  FOR ALL
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Reminders table
CREATE TABLE public.aftersales_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  milestone_id uuid REFERENCES public.sale_milestones(id) ON DELETE SET NULL,
  reminder_date date NOT NULL,
  note text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.aftersales_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage their own reminders"
  ON public.aftersales_reminders
  FOR ALL
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());
