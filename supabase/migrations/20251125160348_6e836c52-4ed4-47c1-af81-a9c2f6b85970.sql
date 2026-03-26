-- Voeg priority veld toe aan projects table
ALTER TABLE public.projects 
ADD COLUMN priority integer NOT NULL DEFAULT 0;

-- Geef automatisch hogere priority aan projecten in gewenste regio's
UPDATE public.projects
SET priority = 10
WHERE city IN (
  'Los Alcázares',
  'Los Alcazares',
  'San Pedro del Pinatar',
  'Santiago de la Ribera',
  'Pilar de la Horadada'
);

-- Index voor betere performance bij sorteren op priority
CREATE INDEX idx_projects_priority ON public.projects(priority DESC);