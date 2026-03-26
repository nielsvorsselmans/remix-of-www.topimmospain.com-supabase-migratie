-- Tabel: conversations (met source tracking voor alle notitie-bronnen)
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  source_type text NOT NULL,
  source_id uuid,
  crm_lead_id uuid REFERENCES public.crm_leads(id),
  raw_notes text NOT NULL,
  anonymized_notes text,
  sentiment text,
  processed boolean DEFAULT false,
  processing_error text,
  UNIQUE(source_type, source_id)
);

-- Tabel: insights
CREATE TABLE public.insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  label text NOT NULL,
  type text NOT NULL,
  raw_quote text NOT NULL,
  normalized_insight text NOT NULL,
  impact_score text,
  frequency integer DEFAULT 1,
  theme text,
  subtheme text
);

-- Tabel: conversation_insights (koppeltabel)
CREATE TABLE public.conversation_insights (
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  insight_id uuid REFERENCES public.insights(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (conversation_id, insight_id)
);

-- Tabel: content_items
CREATE TABLE public.content_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  insight_id uuid REFERENCES public.insights(id) ON DELETE SET NULL,
  platform text NOT NULL,
  hook text NOT NULL,
  angle text NOT NULL,
  body text NOT NULL,
  cta text,
  visual_concept text,
  status text DEFAULT 'Draft'
);

-- RLS inschakelen
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;

-- Policies voor authenticated users
CREATE POLICY "Authenticated users can manage conversations"
  ON public.conversations FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage insights"
  ON public.insights FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage conversation_insights"
  ON public.conversation_insights FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage content_items"
  ON public.content_items FOR ALL USING (auth.role() = 'authenticated');

-- Indexes voor performance
CREATE INDEX idx_conversations_processed ON public.conversations(processed);
CREATE INDEX idx_conversations_source ON public.conversations(source_type);
CREATE INDEX idx_conversations_crm_lead ON public.conversations(crm_lead_id);
CREATE INDEX idx_insights_theme ON public.insights(theme);
CREATE INDEX idx_insights_type ON public.insights(type);
CREATE INDEX idx_content_items_status ON public.content_items(status);
CREATE INDEX idx_content_items_platform ON public.content_items(platform);

-- Updated_at trigger voor insights
CREATE OR REPLACE FUNCTION public.update_insights_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_insights_updated_at
  BEFORE UPDATE ON public.insights
  FOR EACH ROW
  EXECUTE FUNCTION public.update_insights_updated_at();