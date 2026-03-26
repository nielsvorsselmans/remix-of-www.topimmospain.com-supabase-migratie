CREATE TABLE public.aftersales_ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.sale_milestones(id) ON DELETE SET NULL,
  mode TEXT NOT NULL,
  channel TEXT,
  language TEXT DEFAULT 'nl',
  content TEXT NOT NULL,
  result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.aftersales_ai_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage aftersales AI messages"
  ON public.aftersales_ai_messages
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_aftersales_ai_messages_sale_id ON public.aftersales_ai_messages(sale_id);
CREATE INDEX idx_aftersales_ai_messages_created_at ON public.aftersales_ai_messages(created_at DESC);