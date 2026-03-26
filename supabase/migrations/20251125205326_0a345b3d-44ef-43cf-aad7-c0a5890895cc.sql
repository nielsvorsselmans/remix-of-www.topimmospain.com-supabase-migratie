-- Voeg secties toe voor Investeerders pagina
INSERT INTO public.page_sections (page_slug, section_key, title, content, active, order_index)
VALUES
  ('investeerders', 'hero_welcome', 'Welkom Header', 'Gepersonaliseerde welkomstboodschap', true, 1),
  ('investeerders', 'property_overview', 'Property Overview', 'Foto carousel en property details', true, 2),
  ('investeerders', 'embedded_chat', 'Embedded Chatbot', 'Inline chatbot voor vragen', true, 3),
  ('investeerders', 'purchase_costs', 'Aankoopkosten', 'Breakdown van aankoopkosten', true, 4),
  ('investeerders', 'rental_comparables', 'Verhuuranalyse', 'Rental comparables en map', true, 5),
  ('investeerders', 'investment_strategy', 'Investeringsstrategie', 'Educatieve investering content', true, 6),
  ('investeerders', 'investment_faq', 'Investment FAQ', 'Veelgestelde vragen tabs', true, 7),
  ('investeerders', 'closing_cta', 'Afsluitende CTA', 'Call-to-action aan einde pagina', true, 8),
  ('investeerders', 'floating_chat', 'Floating Chatbot', 'Sticky floating chat button', true, 9);

-- Voeg secties toe voor Over Ons pagina
INSERT INTO public.page_sections (page_slug, section_key, title, content, active, order_index)
VALUES
  ('over-ons', 'hero_intro', 'Hero Introductie', 'Wie wij zijn met groepsfoto', true, 1),
  ('over-ons', 'vision_mission', 'Visie & Missie', 'Onze visie en missie statement', true, 2),
  ('over-ons', 'principles', 'Waar Wij Voor Staan', 'Principes en waarden grid', true, 3),
  ('over-ons', 'team', 'Ons Team', 'Team members met foto''s', true, 4),
  ('over-ons', 'journey', '6-Stappen Journey', 'Customer journey overzicht', true, 5),
  ('over-ons', 'testimonials', 'Testimonials', 'Klant ervaringen', true, 6),
  ('over-ons', 'cta', 'Call-to-Action', 'Afsluitende CTA blok', true, 7);

-- Voeg secties toe voor ProjectDetail pagina
INSERT INTO public.page_sections (page_slug, section_key, title, content, active, order_index)
VALUES
  ('projectdetail', 'header_info', 'Project Header', 'Breadcrumb, carousel, titel, prijs, specs', true, 1),
  ('projectdetail', 'description_highlights', 'Beschrijving & Highlights', 'Project beschrijving en highlights', true, 2),
  ('projectdetail', 'chatbot', 'Investment Chatbot', 'Sticky sidebar chatbot', true, 3),
  ('projectdetail', 'videos', 'Video''s Sectie', 'Showhouse en omgeving video''s', true, 4),
  ('projectdetail', 'location_map', 'Locatie & Map', 'Interactieve map en city info', true, 5),
  ('projectdetail', 'property_types', 'Verschillende Types', 'Lijst van properties in project', true, 6),
  ('projectdetail', 'costs_breakdown', 'Kostenoverzicht', 'Total cost of ownership breakdown', true, 7),
  ('projectdetail', 'rental_analysis', 'Verhuuranalyse', 'Rental comparables en ROI', true, 8),
  ('projectdetail', 'educational_content', 'Educatieve Content', 'Project educational section', true, 9),
  ('projectdetail', 'funnel_cta', 'Project Funnel CTA', 'Call-to-action voor next steps', true, 10);