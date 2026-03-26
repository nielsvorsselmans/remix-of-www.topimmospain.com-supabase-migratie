-- Stap 1: Drop de bestaande phase constraint en maak nieuwe met alle fases
ALTER TABLE public.journey_milestones DROP CONSTRAINT journey_milestones_phase_check;

ALTER TABLE public.journey_milestones ADD CONSTRAINT journey_milestones_phase_check 
CHECK (phase = ANY (ARRAY['orientatie', 'selectie', 'bezichtiging', 'aankoop', 'overdracht', 'beheer']::text[]));