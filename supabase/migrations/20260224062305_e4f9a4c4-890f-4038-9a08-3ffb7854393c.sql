
-- ============================================
-- V2 Keuzes & Aanpassingen — sale_choices system
-- ============================================

-- 1. sale_choices — hoofdtabel voor alle keuze-types
CREATE TABLE public.sale_choices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('extra', 'request', 'material')),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  room TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'pending_quote', 'quote_received', 'decided', 'rejected', 'not_wanted')),
  chosen_option_id UUID,
  decided_at TIMESTAMPTZ,
  decided_by_name TEXT,
  price NUMERIC,
  quote_amount NUMERIC,
  quote_url TEXT,
  quote_requested_at TIMESTAMPTZ,
  quote_uploaded_at TIMESTAMPTZ,
  gifted_by_tis BOOLEAN NOT NULL DEFAULT false,
  via_developer BOOLEAN NOT NULL DEFAULT false,
  is_included BOOLEAN NOT NULL DEFAULT false,
  customer_visible BOOLEAN NOT NULL DEFAULT true,
  customer_choice_type TEXT CHECK (customer_choice_type IN ('via_tis', 'self_arranged', 'question_pending')),
  customer_question TEXT,
  admin_answer TEXT,
  customer_decision TEXT CHECK (customer_decision IN ('accepted', 'rejected')),
  customer_decision_at TIMESTAMPTZ,
  customer_decision_reason TEXT,
  add_to_costs BOOLEAN NOT NULL DEFAULT false,
  payment_due_moment TEXT,
  linked_purchase_cost_id UUID,
  admin_response TEXT,
  notes TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  legacy_source_id UUID,
  legacy_source_type TEXT CHECK (legacy_source_type IN ('extra', 'request', 'material')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. sale_choice_options
CREATE TABLE public.sale_choice_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  choice_id UUID NOT NULL REFERENCES public.sale_choices(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC,
  is_chosen BOOLEAN NOT NULL DEFAULT false,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_recommended BOOLEAN NOT NULL DEFAULT false,
  brand TEXT,
  color_code TEXT,
  product_code TEXT,
  highlights JSONB,
  detailed_specs TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. sale_choice_attachments
CREATE TABLE public.sale_choice_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  choice_id UUID NOT NULL REFERENCES public.sale_choices(id) ON DELETE CASCADE,
  option_id UUID REFERENCES public.sale_choice_options(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT NOT NULL DEFAULT 'document' CHECK (file_type IN ('image', 'document', 'quote')),
  title TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- FK for chosen_option_id
ALTER TABLE public.sale_choices 
  ADD CONSTRAINT sale_choices_chosen_option_id_fkey 
  FOREIGN KEY (chosen_option_id) REFERENCES public.sale_choice_options(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX idx_sale_choices_sale_id ON public.sale_choices(sale_id);
CREATE INDEX idx_sale_choices_status ON public.sale_choices(status);
CREATE INDEX idx_sale_choices_type ON public.sale_choices(type);
CREATE INDEX idx_sale_choice_options_choice_id ON public.sale_choice_options(choice_id);
CREATE INDEX idx_sale_choice_attachments_choice_id ON public.sale_choice_attachments(choice_id);
CREATE INDEX idx_sale_choice_attachments_option_id ON public.sale_choice_attachments(option_id);

-- RLS
ALTER TABLE public.sale_choices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_choice_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_choice_attachments ENABLE ROW LEVEL SECURITY;

-- Admin policies using has_role()
CREATE POLICY "Admins can manage sale_choices" ON public.sale_choices
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage sale_choice_options" ON public.sale_choice_options
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage sale_choice_attachments" ON public.sale_choice_attachments
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Customer read policies
CREATE POLICY "Customers can view their visible choices" ON public.sale_choices
  FOR SELECT USING (
    customer_visible = true AND
    sale_id IN (
      SELECT sc.sale_id FROM public.sale_customers sc
      JOIN public.crm_leads cl ON cl.id = sc.crm_lead_id
      WHERE cl.user_id = auth.uid()
    )
  );

CREATE POLICY "Customers can view options of visible choices" ON public.sale_choice_options
  FOR SELECT USING (
    choice_id IN (
      SELECT c.id FROM public.sale_choices c
      WHERE c.customer_visible = true
      AND c.sale_id IN (
        SELECT sc.sale_id FROM public.sale_customers sc
        JOIN public.crm_leads cl ON cl.id = sc.crm_lead_id
        WHERE cl.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Customers can view attachments of visible choices" ON public.sale_choice_attachments
  FOR SELECT USING (
    choice_id IN (
      SELECT c.id FROM public.sale_choices c
      WHERE c.customer_visible = true
      AND c.sale_id IN (
        SELECT sc.sale_id FROM public.sale_customers sc
        JOIN public.crm_leads cl ON cl.id = sc.crm_lead_id
        WHERE cl.user_id = auth.uid()
      )
    )
  );

-- Triggers
CREATE TRIGGER update_sale_choices_updated_at
  BEFORE UPDATE ON public.sale_choices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sale_choice_options_updated_at
  BEFORE UPDATE ON public.sale_choice_options
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Sync chosen option trigger
CREATE OR REPLACE FUNCTION public.sync_sale_choice_option()
  RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.is_chosen = true THEN
    UPDATE public.sale_choice_options
    SET is_chosen = false, updated_at = NOW()
    WHERE choice_id = NEW.choice_id AND id != NEW.id AND is_chosen = true;
    
    UPDATE public.sale_choices
    SET chosen_option_id = NEW.id, decided_at = COALESCE(decided_at, NOW()),
        status = 'decided', price = NEW.price, updated_at = NOW()
    WHERE id = NEW.choice_id;
  ELSIF NEW.is_chosen = false AND OLD.is_chosen = true THEN
    UPDATE public.sale_choices
    SET chosen_option_id = NULL, status = 'open', updated_at = NOW()
    WHERE id = NEW.choice_id AND chosen_option_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_sale_choice_option_trigger
  AFTER UPDATE OF is_chosen ON public.sale_choice_options
  FOR EACH ROW EXECUTE FUNCTION public.sync_sale_choice_option();

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('sale-choice-attachments', 'sale-choice-attachments', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins can manage choice attachment files" ON storage.objects
  FOR ALL USING (
    bucket_id = 'sale-choice-attachments' AND
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Public read choice attachment files" ON storage.objects
  FOR SELECT USING (bucket_id = 'sale-choice-attachments');
