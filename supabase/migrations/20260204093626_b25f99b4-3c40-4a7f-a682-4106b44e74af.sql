-- Verwijder de oude constraint
ALTER TABLE customer_project_selections 
DROP CONSTRAINT IF EXISTS valid_selection_status;

-- Voeg de nieuwe constraint toe met 'to_visit'
ALTER TABLE customer_project_selections 
ADD CONSTRAINT valid_selection_status 
CHECK (status = ANY (ARRAY['suggested', 'interested', 'to_visit', 'visited', 'rejected']));