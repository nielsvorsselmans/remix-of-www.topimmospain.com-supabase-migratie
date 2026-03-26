-- =============================================
-- MATERIAL SELECTIONS SYSTEM
-- Dynamic material choice management for sales
-- =============================================

-- 1. Material Selections - Main categories per sale
CREATE TABLE public.material_selections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  room TEXT,
  title TEXT NOT NULL,
  description TEXT,
  chosen_option_id UUID,
  decided_at TIMESTAMP WITH TIME ZONE,
  decided_by_name TEXT,
  customer_visible BOOLEAN NOT NULL DEFAULT true,
  order_index INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Material Options - Available options per selection
CREATE TABLE public.material_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  selection_id UUID NOT NULL REFERENCES public.material_selections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color_code TEXT,
  brand TEXT,
  product_code TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_chosen BOOLEAN NOT NULL DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add FK for chosen_option_id
ALTER TABLE public.material_selections 
ADD CONSTRAINT material_selections_chosen_option_id_fkey 
FOREIGN KEY (chosen_option_id) REFERENCES public.material_options(id) ON DELETE SET NULL;

-- 3. Material Option Images
CREATE TABLE public.material_option_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  option_id UUID NOT NULL REFERENCES public.material_options(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  title TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Material Templates
CREATE TABLE public.material_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  room TEXT,
  title TEXT NOT NULL,
  description TEXT,
  default_options JSONB,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- INDEXES
CREATE INDEX idx_material_selections_sale_id ON public.material_selections(sale_id);
CREATE INDEX idx_material_selections_category ON public.material_selections(category);
CREATE INDEX idx_material_options_selection_id ON public.material_options(selection_id);
CREATE INDEX idx_material_option_images_option_id ON public.material_option_images(option_id);
CREATE INDEX idx_material_templates_project_id ON public.material_templates(project_id);

-- ROW LEVEL SECURITY
ALTER TABLE public.material_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_option_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_templates ENABLE ROW LEVEL SECURITY;

-- Admin policies using has_role function
CREATE POLICY "Admins can manage material_selections"
ON public.material_selections FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage material_options"
ON public.material_options FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage material_option_images"
ON public.material_option_images FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage material_templates"
ON public.material_templates FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Customer read access
CREATE POLICY "Customers can view their sale materials"
ON public.material_selections FOR SELECT
USING (
  customer_visible = true AND
  EXISTS (
    SELECT 1 FROM public.sales s
    JOIN public.sale_customers sc ON sc.sale_id = s.id
    JOIN public.crm_leads cl ON cl.id = sc.crm_lead_id
    WHERE s.id = material_selections.sale_id
    AND cl.user_id = auth.uid()
  )
);

CREATE POLICY "Customers can view material options"
ON public.material_options FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.material_selections ms
    JOIN public.sales s ON s.id = ms.sale_id
    JOIN public.sale_customers sc ON sc.sale_id = s.id
    JOIN public.crm_leads cl ON cl.id = sc.crm_lead_id
    WHERE ms.id = material_options.selection_id
    AND ms.customer_visible = true
    AND cl.user_id = auth.uid()
  )
);

CREATE POLICY "Customers can view material images"
ON public.material_option_images FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.material_options mo
    JOIN public.material_selections ms ON ms.id = mo.selection_id
    JOIN public.sales s ON s.id = ms.sale_id
    JOIN public.sale_customers sc ON sc.sale_id = s.id
    JOIN public.crm_leads cl ON cl.id = sc.crm_lead_id
    WHERE mo.id = material_option_images.option_id
    AND ms.customer_visible = true
    AND cl.user_id = auth.uid()
  )
);

-- Partner read access
CREATE POLICY "Partners can view referred customer materials"
ON public.material_selections FOR SELECT
USING (
  customer_visible = true AND
  EXISTS (
    SELECT 1 FROM public.sales s
    JOIN public.sale_customers sc ON sc.sale_id = s.id
    JOIN public.crm_leads cl ON cl.id = sc.crm_lead_id
    JOIN public.partners p ON p.id = cl.referred_by_partner_id
    WHERE s.id = material_selections.sale_id
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Partners can view material options"
ON public.material_options FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.material_selections ms
    JOIN public.sales s ON s.id = ms.sale_id
    JOIN public.sale_customers sc ON sc.sale_id = s.id
    JOIN public.crm_leads cl ON cl.id = sc.crm_lead_id
    JOIN public.partners p ON p.id = cl.referred_by_partner_id
    WHERE ms.id = material_options.selection_id
    AND ms.customer_visible = true
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Partners can view material images"
ON public.material_option_images FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.material_options mo
    JOIN public.material_selections ms ON ms.id = mo.selection_id
    JOIN public.sales s ON s.id = ms.sale_id
    JOIN public.sale_customers sc ON sc.sale_id = s.id
    JOIN public.crm_leads cl ON cl.id = sc.crm_lead_id
    JOIN public.partners p ON p.id = cl.referred_by_partner_id
    WHERE mo.id = material_option_images.option_id
    AND ms.customer_visible = true
    AND p.user_id = auth.uid()
  )
);

-- TRIGGERS
CREATE TRIGGER update_material_selections_updated_at
BEFORE UPDATE ON public.material_selections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_material_options_updated_at
BEFORE UPDATE ON public.material_options
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_material_templates_updated_at
BEFORE UPDATE ON public.material_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Sync chosen option function
CREATE OR REPLACE FUNCTION public.sync_material_option_choice()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_chosen = true THEN
    UPDATE public.material_options
    SET is_chosen = false, updated_at = NOW()
    WHERE selection_id = NEW.selection_id AND id != NEW.id AND is_chosen = true;
    
    UPDATE public.material_selections
    SET 
      chosen_option_id = NEW.id,
      decided_at = COALESCE(decided_at, NOW()),
      updated_at = NOW()
    WHERE id = NEW.selection_id;
  ELSIF NEW.is_chosen = false AND OLD.is_chosen = true THEN
    UPDATE public.material_selections
    SET chosen_option_id = NULL, updated_at = NOW()
    WHERE id = NEW.selection_id AND chosen_option_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_material_option_choice_trigger
AFTER INSERT OR UPDATE OF is_chosen ON public.material_options
FOR EACH ROW
EXECUTE FUNCTION public.sync_material_option_choice();