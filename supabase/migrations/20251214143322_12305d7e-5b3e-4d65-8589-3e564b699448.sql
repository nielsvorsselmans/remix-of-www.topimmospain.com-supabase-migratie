-- Create missing projects for orphaned properties
-- First, find all development_ids that have properties but no project
INSERT INTO public.projects (
  development_ref,
  name,
  project_key,
  city,
  location,
  region,
  country,
  latitude,
  longitude,
  price_from,
  price_to,
  featured_image,
  active,
  status
)
SELECT DISTINCT ON (p.development_id)
  p.development_id as development_ref,
  CONCAT('Project ', COALESCE(p.city, 'Onbekend')) as name,
  CONCAT('dev-', LOWER(REGEXP_REPLACE(p.development_id, '[^a-zA-Z0-9]', '-', 'g'))) as project_key,
  p.city,
  p.address as location,
  p.region,
  COALESCE(p.country, 'Spanje') as country,
  p.latitude,
  p.longitude,
  (SELECT MIN(price) FROM public.properties WHERE development_id = p.development_id AND price > 0) as price_from,
  (SELECT MAX(price) FROM public.properties WHERE development_id = p.development_id AND price > 0) as price_to,
  COALESCE(p.image_url, (p.images->>0)::text) as featured_image,
  true as active,
  'active' as status
FROM public.properties p
WHERE p.development_id IS NOT NULL
  AND p.development_id != ''
  AND NOT EXISTS (
    SELECT 1 FROM public.projects pr WHERE pr.development_ref = p.development_id
  )
ORDER BY p.development_id, p.created_at DESC;

-- Now link all orphaned properties to their newly created projects
UPDATE public.properties p
SET project_id = pr.id
FROM public.projects pr
WHERE p.development_id = pr.development_ref
  AND p.project_id IS NULL
  AND p.development_id IS NOT NULL;