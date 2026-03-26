-- Add category column to pages table
ALTER TABLE public.pages 
ADD COLUMN IF NOT EXISTS category text DEFAULT 'other';

-- Insert all missing pages from App.tsx routes
INSERT INTO public.pages (page_slug, display_name, description, category, active, order_index) VALUES
  ('/', 'Homepage', 'Hoofdpagina van de website', 'main', true, 1),
  ('/investeren-in-spanje', 'Investeren in Spanje', 'Informatie over investeren in Spanje', 'main', true, 2),
  ('/over-ons', 'Over Ons', 'Over Viva Vastgoed', 'main', true, 3),
  ('/projecten', 'Projecten Overzicht', 'Overzicht van alle projecten', 'projects', true, 4),
  ('/projecten/:id', 'Project Detail', 'Detailpagina van een project', 'projects', true, 5),
  ('/projecten/gemeenten', 'Gemeenten Overzicht', 'Overzicht van alle gemeenten', 'projects', true, 6),
  ('/projecten/gemeente/:city', 'Gemeente Detail', 'Detailpagina van een gemeente', 'projects', true, 7),
  ('/contact', 'Contact', 'Contactpagina', 'main', true, 8),
  ('/portaal', 'Portaal', 'Viva Vastgoed Portaal landingspagina', 'main', true, 9),
  ('/klantverhalen', 'Klantverhalen', 'Overzicht van klantverhalen', 'main', true, 10),
  ('/klantverhalen/:slug', 'Klantverhaal Detail', 'Detailpagina van een klantverhaal', 'main', true, 11),
  ('/partners', 'Partners', 'Overzicht van partners', 'partners', true, 12),
  ('/referenties', 'Referenties', 'Referenties en reviews', 'main', true, 13),
  ('/eigengebruik', 'Eigengebruik', 'Informatie over eigengebruik', 'main', true, 14),
  ('/stappenplan', 'Stappenplan', 'Stappenplan voor aankoop', 'main', true, 15),
  ('/investeerders', 'Investeerders', 'Investeerders pagina', 'main', true, 16),
  ('/blog', 'Blog Overzicht', 'Overzicht van alle blog posts', 'blog', true, 17),
  ('/blog/:slug', 'Blog Post', 'Detailpagina van een blog post', 'blog', true, 18),
  ('/blog/aankoopproces', 'Aankoopproces', 'Informatie over het aankoopproces', 'blog', true, 19),
  ('/blog/financiering-hypotheek', 'Financiering & Hypotheek', 'Informatie over financiering en hypotheek', 'blog', true, 20),
  ('/blog/regio-informatie', 'Regio Informatie', 'Informatie over verschillende regios', 'blog', true, 21),
  ('/blog/veelgestelde-vragen', 'Veelgestelde Vragen', 'FAQ pagina', 'blog', true, 22),
  ('/privacy', 'Privacy', 'Privacyverklaring', 'legal', true, 23),
  ('/cookies', 'Cookies', 'Cookiebeleid', 'legal', true, 24),
  ('/algemene-voorwaarden', 'Algemene Voorwaarden', 'Algemene voorwaarden', 'legal', true, 25),
  ('/api-documentatie', 'API Documentatie', 'API documentatie', 'other', true, 26),
  ('/dashboard', 'Dashboard', 'Gebruikers dashboard', 'dashboard', true, 27),
  ('/dashboard/favorieten', 'Favorieten', 'Favoriete projecten', 'dashboard', true, 28),
  ('/dashboard/vergelijk', 'Vergelijk', 'Projecten vergelijken', 'dashboard', true, 29)
ON CONFLICT (page_slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  category = EXCLUDED.category;