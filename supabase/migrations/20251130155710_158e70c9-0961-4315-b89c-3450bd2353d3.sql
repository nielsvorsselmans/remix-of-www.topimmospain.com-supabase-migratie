-- Create FAQ categories table
CREATE TABLE IF NOT EXISTS public.faq_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  icon_name TEXT NOT NULL,
  context_type TEXT NOT NULL CHECK (context_type IN ('investment', 'contact', 'story', 'phase', 'general')),
  context_value TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create FAQ items table
CREATE TABLE IF NOT EXISTS public.faq_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.faq_categories(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  cta_link TEXT,
  cta_text TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.faq_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for faq_categories
CREATE POLICY "Admins can manage FAQ categories"
  ON public.faq_categories
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active FAQ categories"
  ON public.faq_categories
  FOR SELECT
  USING (active = true);

-- RLS Policies for faq_items
CREATE POLICY "Admins can manage FAQ items"
  ON public.faq_items
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active FAQ items"
  ON public.faq_items
  FOR SELECT
  USING (active = true AND EXISTS (
    SELECT 1 FROM public.faq_categories
    WHERE id = faq_items.category_id AND active = true
  ));

-- Create updated_at trigger for both tables
CREATE TRIGGER update_faq_categories_updated_at
  BEFORE UPDATE ON public.faq_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_faq_items_updated_at
  BEFORE UPDATE ON public.faq_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_faq_categories_context ON public.faq_categories(context_type, context_value) WHERE active = true;
CREATE INDEX idx_faq_categories_order ON public.faq_categories(order_index) WHERE active = true;
CREATE INDEX idx_faq_items_category ON public.faq_items(category_id) WHERE active = true;
CREATE INDEX idx_faq_items_order ON public.faq_items(order_index) WHERE active = true;