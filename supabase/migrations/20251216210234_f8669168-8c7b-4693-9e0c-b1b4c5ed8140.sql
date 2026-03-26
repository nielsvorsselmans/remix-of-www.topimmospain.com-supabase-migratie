-- Kostenherstructurering: BTW verwijderen, advocaat splitsen, due_moments bijwerken

-- 1. Verwijder BTW records (zit al in betalingen)
DELETE FROM sale_purchase_costs WHERE cost_type = 'btw';

-- 2. Update due_moment voor bestaande kosten
-- Volmacht en NIE naar na_akte (na notariële akte)
UPDATE sale_purchase_costs SET due_moment = 'na_akte', order_index = 2 WHERE cost_type = 'volmacht';
UPDATE sale_purchase_costs SET due_moment = 'na_akte', order_index = 3 WHERE cost_type = 'nie';

-- Bankkosten, administratie, AJD, notaris, registratie naar bij_oplevering
UPDATE sale_purchase_costs SET due_moment = 'bij_oplevering', order_index = 4 WHERE cost_type = 'bankkosten';
UPDATE sale_purchase_costs SET due_moment = 'bij_oplevering', order_index = 5 WHERE cost_type = 'administratie';
UPDATE sale_purchase_costs SET due_moment = 'bij_oplevering', order_index = 6 WHERE cost_type = 'ajd';
UPDATE sale_purchase_costs SET due_moment = 'bij_oplevering', order_index = 7 WHERE cost_type = 'notaris';
UPDATE sale_purchase_costs SET due_moment = 'bij_oplevering', order_index = 10 WHERE cost_type = 'registratie';

-- Nutsvoorzieningen blijft bij_oplevering maar update order_index
UPDATE sale_purchase_costs SET order_index = 9 WHERE cost_type = 'nutsvoorzieningen';

-- 3. Split advocaatkosten in twee records
-- Eerst: maak een kopie voor advocaat_vooraf (50% voorschot)
INSERT INTO sale_purchase_costs (
  sale_id, cost_type, label, estimated_amount, actual_amount, is_finalized, 
  due_moment, is_paid, percentage, is_optional, tooltip, order_index
)
SELECT 
  sale_id, 
  'advocaat_vooraf', 
  'Advocaatkosten (voorschot)',
  ROUND(estimated_amount / 2),
  CASE WHEN actual_amount IS NOT NULL THEN ROUND(actual_amount / 2) ELSE NULL END,
  is_finalized,
  'vooraf',
  is_paid,
  0.605,
  false,
  'Juridische begeleiding: 50% voorschot',
  1
FROM sale_purchase_costs WHERE cost_type = 'advocaat';

-- Dan: update bestaande advocaat record naar advocaat_oplevering (50% saldo)
UPDATE sale_purchase_costs 
SET 
  cost_type = 'advocaat_oplevering',
  label = 'Advocaatkosten (saldo)',
  estimated_amount = ROUND(estimated_amount / 2),
  actual_amount = CASE WHEN actual_amount IS NOT NULL THEN ROUND(actual_amount / 2) ELSE NULL END,
  percentage = 0.605,
  due_moment = 'bij_oplevering',
  tooltip = 'Juridische begeleiding: 50% bij oplevering',
  order_index = 8
WHERE cost_type = 'advocaat';