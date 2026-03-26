-- Fix bestaande records waar status = decided maar customer_choice_type ontbreekt
UPDATE public.sale_extra_categories
SET customer_choice_type = CASE
  -- Als het een cadeau is, zet op gift_accepted
  WHEN gifted_by_tis = true THEN 'gift_accepted'
  -- Als er een gekozen optie is, dan via_tis
  WHEN chosen_option_id IS NOT NULL THEN 'via_tis'
  -- Anders zelf regelen (edge case)
  ELSE 'self_arranged'
END
WHERE status = 'decided'
AND customer_choice_type IS NULL
AND is_included = false;