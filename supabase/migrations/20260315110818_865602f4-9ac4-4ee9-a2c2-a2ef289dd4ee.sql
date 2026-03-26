
-- Backfill nazorg milestones for all existing sales that don't have them yet
INSERT INTO public.sale_milestones (sale_id, title, description, phase, template_key, order_index, customer_visible, priority, milestone_group)
SELECT 
  s.id,
  t.title,
  t.description,
  'nazorg',
  t.key,
  t.order_index,
  t.customer_visible,
  'medium',
  t.milestone_group
FROM public.sales s
CROSS JOIN (
  VALUES 
    ('nazorg_nutsvoorzieningen', 'Nutsvoorzieningen overgedragen', 'Elektriciteit, water, gas en internet op naam van de klant gezet', 1, true, 'nazorg_praktisch'),
    ('nazorg_verzekering', 'Opstalverzekering afgesloten', 'Controleer of de klant een opstalverzekering heeft afgesloten', 2, true, 'nazorg_praktisch'),
    ('nazorg_belastingen', 'Gemeentelijke belastingen geregeld (IBI, basura)', 'Controleer of de klant is geregistreerd voor lokale belastingen', 3, true, 'nazorg_praktisch'),
    ('nazorg_vve', 'Aanmelding VvE / Comunidad de Propietarios', 'Klant is aangemeld als nieuw lid van de VvE', 4, true, 'nazorg_praktisch'),
    ('nazorg_followup', 'Follow-up call/e-mail na 2 weken', 'Neem contact op met de klant om te vragen of alles naar wens is', 5, false, 'nazorg_opvolging'),
    ('nazorg_financieel', 'Financiële afhandeling intern gecontroleerd', 'Controleer of alle financiële aspecten van de verkoop zijn afgehandeld', 6, false, 'nazorg_intern'),
    ('nazorg_archivering', 'Dossier gearchiveerd', 'Alle documenten en communicatie correct gearchiveerd', 7, false, 'nazorg_intern')
) AS t(key, title, description, order_index, customer_visible, milestone_group)
WHERE NOT EXISTS (
  SELECT 1 FROM public.sale_milestones sm
  WHERE sm.sale_id = s.id AND sm.template_key = t.key
);
