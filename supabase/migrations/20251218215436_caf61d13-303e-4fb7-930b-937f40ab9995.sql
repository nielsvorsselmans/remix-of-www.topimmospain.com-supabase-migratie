-- Verwijder alle bestaande "Klant uitgenodigd voor review" taken
DELETE FROM sale_milestones 
WHERE template_key = 'akk_uitgenodigd';

-- Pas de order_index aan voor de resterende akkoord taken (verlaag met 1 voor taken die na akk_uitgenodigd kwamen)
UPDATE sale_milestones
SET order_index = order_index - 1
WHERE phase = 'akkoord' 
  AND order_index > 1;