-- Add slug and seo_data columns
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS seo_data jsonb;

-- Generate slugs from existing data
UPDATE public.projects
SET slug = lower(
  regexp_replace(
    regexp_replace(
      'nieuwbouw-' || coalesce(city, 'spanje') || '-' || name,
      '[^a-zA-Z0-9\-]', '-', 'g'
    ),
    '-+', '-', 'g'
  )
)
WHERE slug IS NULL;

-- Trim trailing dashes
UPDATE public.projects
SET slug = trim(both '-' from slug)
WHERE slug LIKE '-%' OR slug LIKE '%-';

-- Fix duplicate slugs by appending id suffix
WITH dupes AS (
  SELECT id, slug,
    ROW_NUMBER() OVER (PARTITION BY slug ORDER BY created_at) as rn
  FROM public.projects
  WHERE slug IS NOT NULL
)
UPDATE public.projects p
SET slug = d.slug || '-' || d.rn
FROM dupes d
WHERE p.id = d.id AND d.rn > 1;

-- Create unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_slug ON public.projects(slug) WHERE slug IS NOT NULL;