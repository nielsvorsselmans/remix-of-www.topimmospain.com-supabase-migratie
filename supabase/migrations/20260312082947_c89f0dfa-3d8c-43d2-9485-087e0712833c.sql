
-- Replace old akk_specs_compleet milestones with new offerte tracking milestones
-- Step 1: Delete the old akk_specs_compleet milestone from all sales
DELETE FROM public.sale_milestones WHERE template_key = 'akk_specs_compleet';

-- Step 2: Insert new offerte tracking milestones for all sales that have akkoord-phase milestones
INSERT INTO public.sale_milestones (sale_id, title, description, phase, template_key, order_index, milestone_group, priority)
SELECT DISTINCT
  sm.sale_id,
  t.title,
  t.description,
  'akkoord',
  t.template_key,
  t.order_index,
  t.milestone_group,
  'medium'
FROM public.sale_milestones sm
CROSS JOIN (
  VALUES 
    ('akk_offertes_aangevraagd', 'Alle offertes aangevraagd', 'Alle benodigde offertes zijn aangevraagd bij de ontwikkelaar', 1, 'offertes_afgehandeld'),
    ('akk_offertes_ontvangen', 'Alle offertes ontvangen', 'Alle aangevraagde offertes zijn ontvangen van de ontwikkelaar', 2, 'offertes_afgehandeld'),
    ('akk_offertes_beslissing', 'Klant beslissing op alle offertes', 'De klant heeft op alle offertes een beslissing genomen', 3, 'offertes_afgehandeld')
) AS t(template_key, title, description, order_index, milestone_group)
WHERE sm.phase = 'akkoord'
AND NOT EXISTS (
  SELECT 1 FROM public.sale_milestones existing 
  WHERE existing.sale_id = sm.sale_id 
  AND existing.template_key = t.template_key
);

-- Step 3: Update order_index for existing akkoord milestones to accommodate new tasks
UPDATE public.sale_milestones
SET order_index = CASE template_key
  WHEN 'akk_grondplan' THEN 4
  WHEN 'akk_elektriciteit' THEN 5
  WHEN 'akk_extras' THEN 6
  WHEN 'akk_definitief' THEN 7
  WHEN 'akk_doorgegeven' THEN 8
  ELSE order_index
END
WHERE phase = 'akkoord'
AND template_key IN ('akk_grondplan', 'akk_elektriciteit', 'akk_extras', 'akk_definitief', 'akk_doorgegeven');
