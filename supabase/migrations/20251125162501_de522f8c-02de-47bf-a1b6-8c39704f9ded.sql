-- Create pages table for page-level visibility control
CREATE TABLE IF NOT EXISTS public.pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_slug TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

-- Admins can manage pages
CREATE POLICY "Admins can manage pages"
ON public.pages
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Everyone can view active pages
CREATE POLICY "Anyone can view active pages"
ON public.pages
FOR SELECT
USING (active = true);

-- Add update trigger
CREATE TRIGGER update_pages_updated_at
BEFORE UPDATE ON public.pages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert common pages
INSERT INTO public.pages (page_slug, display_name, description, active, order_index) VALUES
  ('home', 'Homepage', 'De hoofdpagina van de website', true, 1),
  ('projecten', 'Projecten Overzicht', 'Overzicht van alle projecten', true, 2),
  ('projecten/gemeenten', 'Gemeenten Overzicht', 'Overzicht van alle gemeenten', true, 3),
  ('investeerders', 'Investeerders Pagina', 'Informatie voor investeerders', true, 4),
  ('over-ons', 'Over Ons', 'Over Viva Vastgoed', true, 5),
  ('klantverhalen', 'Klantverhalen', 'Verhalen van tevreden klanten', true, 6),
  ('contact', 'Contact', 'Contactpagina', true, 7),
  ('portaal', 'Portaal Landing', 'Portaal registratie/login pagina', true, 8)
ON CONFLICT (page_slug) DO NOTHING;