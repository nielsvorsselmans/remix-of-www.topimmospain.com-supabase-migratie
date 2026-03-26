-- Create page_sections table for dynamic page content
CREATE TABLE public.page_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_slug TEXT NOT NULL,
  section_key TEXT NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(page_slug, section_key)
);

-- Create partner_categories table for category information
CREATE TABLE public.partner_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  intro_text TEXT NOT NULL,
  icon_name TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.page_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for page_sections
CREATE POLICY "Anyone can view active page sections"
  ON public.page_sections
  FOR SELECT
  USING (active = true);

CREATE POLICY "Admins can manage page sections"
  ON public.page_sections
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for partner_categories
CREATE POLICY "Anyone can view active partner categories"
  ON public.partner_categories
  FOR SELECT
  USING (active = true);

CREATE POLICY "Admins can manage partner categories"
  ON public.partner_categories
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default partner categories
INSERT INTO public.partner_categories (category_key, display_name, intro_text, icon_name, order_index) VALUES
('vastgoed_nl_be', 'Vastgoedpartners (Nederland & België)', 'We werken samen met betrouwbare makelaars in Nederland en België die het eerste contactpunt kunnen zijn voor wie zich oriënteert. Zij delen onze waarden van rust, begeleiding en transparantie, en helpen klanten zich voor te bereiden met lokale gesprekken voordat ze de stap naar Spanje zetten.', 'Building2', 1),
('hypotheek_nl_be', 'Hypotheekpartners (Nederland & België)', 'Financiering vraagt expertise. We werken samen met hypotheekadviseurs in Nederland en België die je helpen je financiële mogelijkheden helder te krijgen. Dit versnelt de voorbereiding op een eventuele Spaanse hypotheek en zorgt voor een veilig en duidelijk proces.', 'Landmark', 2),
('juridisch', 'Juridische Partner: Confianz Advocaten', 'Een advocaat is essentieel bij een Spaanse vastgoedaankoop. Confianz Advocaten is ons juridische ankerpunt: Nederlandstalig, meer dan 20 jaar ervaring, en volledig transparant. Zij voeren alle juridische checks uit, begeleiden de NIE-aanvraag, volmacht en notarisafspraken. We werken uitsluitend met betrouwbare advocaten die onze waarden delen.', 'Scale', 3),
('hypotheek_spanje', 'Spaanse Hypotheekpartner: HABENO', 'Spaanse financiering vraagt specialistische kennis. HABENO kent de Spaanse markt door en door en helpt klanten met bankdossiers, taxaties en voorwaarden. Ze werken aanvullend op de Nederlandse en Belgische hypotheekadviseurs en verhogen de kans op goedkeuring aanzienlijk.', 'HeartHandshake', 4);

-- Insert default page sections for partners page
INSERT INTO public.page_sections (page_slug, section_key, title, content, order_index) VALUES
('partners', 'hero_title', NULL, 'Onze Partners', 1),
('partners', 'hero_subtitle', NULL, 'Ons netwerk van gespecialiseerde partners ondersteunt je in elk onderdeel van jouw vastgoedreis. Van juridisch advies en financiering tot lokale expertise – samen zorgen we voor een volledig A-tot-Z traject waarin jij centraal staat.', 2),
('partners', 'hero_description', NULL, 'Dit netwerk is niet toevallig ontstaan. Het is gebouwd op vertrouwen, ervaring en gedeelde waarden. Elke partner is geselecteerd omdat ze dezelfde missie delen als wij: heldere, zorgeloze begeleiding voor klanten die het verdienen.', 3),
('partners', 'network_title', NULL, 'Ons netwerk is jouw zekerheid', 4),
('partners', 'network_intro', NULL, 'Ons partnernetwerk is gebouwd op vertrouwen, transparantie en bewezen samenwerking. Elke partner is zorgvuldig geselecteerd op basis van expertise, betrouwbaarheid en de manier waarop ze met klanten omgaan.', 5),
('partners', 'network_middle', NULL, 'Dit netwerk stelt ons in staat om een volledig A-tot-Z traject aan te bieden: van de eerste oriëntatie in Nederland of België, via juridische controles en financiering, tot de sleuteloverdracht in Spanje. Elk onderdeel wordt gedragen door professionals die weten wat ze doen.', 6),
('partners', 'network_closing', NULL, 'Voor jou betekent dit: rust, duidelijkheid en de zekerheid dat je wordt omringd door mensen die jouw belang vooropstellen.', 7),
('partners', 'cta_title', NULL, 'Klaar om de volgende stap te zetten?', 8),
('partners', 'cta_subtitle', NULL, 'Ontdek hoe ons netwerk jou kan helpen bij jouw vastgoedreis in Spanje.', 9);

-- Add trigger for updated_at
CREATE TRIGGER update_page_sections_updated_at
  BEFORE UPDATE ON public.page_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_partner_categories_updated_at
  BEFORE UPDATE ON public.partner_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();