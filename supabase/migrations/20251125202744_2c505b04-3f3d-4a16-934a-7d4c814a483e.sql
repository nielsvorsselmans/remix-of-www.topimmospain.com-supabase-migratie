-- Voeg homepage secties toe aan page_sections tabel
INSERT INTO public.page_sections (page_slug, section_key, title, content, active, order_index)
VALUES
  ('/', 'hero', 'Hero Sectie', 'Hoofdbanner met call-to-action', true, 1),
  ('/', 'why_invest', 'Waarom Investeren', 'Drie pijlers van investeren in Spanje', true, 2),
  ('/', 'process', 'Proces Overzicht', '6-fasen begeleiding overzicht', true, 3),
  ('/', 'regio_spotlight', 'Ontdek de Costa Calida', 'Regio spotlight met gemeenten', true, 4),
  ('/', 'featured_projects', 'Uitgelichte Projecten', 'Grid met aanbevolen projecten', true, 5),
  ('/', 'reviews', 'Klantverhalen', 'Testimonials en reviews', true, 6),
  ('/', 'blog_posts', 'Laatste Blog Posts', 'Nieuwste artikelen en kennisbank', true, 7),
  ('/', 'cta', 'Call-to-Action', 'Portaal toegang en contact CTA', true, 8);