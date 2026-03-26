-- Verwijder priority van Santiago de la Ribera
UPDATE projects SET priority = 0 WHERE city = 'Santiago de la Ribera';

-- Voeg priority toe aan San Miguel de Salinas
UPDATE projects SET priority = 10 WHERE city = 'San Miguel de Salinas';