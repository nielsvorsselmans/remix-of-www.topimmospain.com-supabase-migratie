
-- Drop existing materialized view and its indexes
DROP MATERIALIZED VIEW IF EXISTS public.project_aggregations;

-- Recreate with LEFT JOIN (includes resale projects without properties),
-- fixed has_pool, is_resale, min_distance_to_beach, and project-level fallbacks
CREATE MATERIALIZED VIEW public.project_aggregations AS
SELECT 
  p.id,
  p.name,
  p.display_title,
  p.location,
  p.city,
  p.region,
  p.country,
  p.description,
  p.featured_image,
  p.latitude,
  p.longitude,
  p.development_ref,
  p.status,
  p.completion_date,
  p.highlights,
  p.environment_video_url,
  p.showhouse_video_url,
  p.project_key,
  COALESCE(p.priority, 0) AS priority,
  p.created_at,
  p.updated_at,
  COALESCE(p.is_resale, false) AS is_resale,
  -- Price: use property prices if available, fall back to project-level
  COALESCE(MIN(pr.price), p.price_from) AS price_from,
  COALESCE(MAX(pr.price), p.price_to) AS price_to,
  -- Property types: from properties or project-level
  COALESCE(
    ARRAY_AGG(DISTINCT pr.property_type) FILTER (WHERE pr.property_type IS NOT NULL),
    p.property_types,
    ARRAY[]::text[]
  ) AS property_types,
  -- Counts
  COALESCE(COUNT(pr.id)::integer, 0) AS total_count,
  COALESCE(COUNT(pr.id) FILTER (WHERE pr.status = 'available')::integer, 0) AS available_count,
  COALESCE(COUNT(pr.id) FILTER (WHERE pr.status = 'sold')::integer, 0) AS sold_count,
  -- Bedrooms/bathrooms/area: from properties or project-level
  COALESCE(MIN(pr.bedrooms), p.min_bedrooms) AS min_bedrooms,
  COALESCE(MAX(pr.bedrooms), p.max_bedrooms) AS max_bedrooms,
  COALESCE(MIN(pr.bathrooms), p.min_bathrooms) AS min_bathrooms,
  COALESCE(MAX(pr.bathrooms), p.max_bathrooms) AS max_bathrooms,
  COALESCE(MIN(pr.area_sqm), p.min_area) AS min_area,
  COALESCE(MAX(pr.area_sqm), p.max_area) AS max_area,
  -- Cities from properties
  COALESCE(
    ARRAY_AGG(DISTINCT pr.city) FILTER (WHERE pr.city IS NOT NULL),
    CASE WHEN p.city IS NOT NULL THEN ARRAY[p.city] ELSE ARRAY[]::text[] END
  ) AS cities,
  -- Distances
  COALESCE(
    ARRAY_AGG(DISTINCT pr.distance_to_beach_m) FILTER (WHERE pr.distance_to_beach_m IS NOT NULL),
    CASE WHEN p.distance_to_beach_m IS NOT NULL THEN ARRAY[p.distance_to_beach_m] ELSE ARRAY[]::integer[] END
  ) AS distances_to_beach,
  COALESCE(MIN(pr.distance_to_beach_m), p.distance_to_beach_m) AS min_distance_to_beach,
  -- Pool: fixed logic using COALESCE to handle NULLs
  COALESCE(
    BOOL_OR(COALESCE(pr.pool, false) OR COALESCE(pr.private_pool, false) OR COALESCE(pr.communal_pool, false)),
    COALESCE(p.has_pool, false)
  ) AS has_pool,
  COALESCE(BOOL_OR(COALESCE(pr.private_pool, false)), COALESCE(p.has_private_pool, false)) AS has_private_pool,
  COALESCE(BOOL_OR(COALESCE(pr.communal_pool, false)), COALESCE(p.has_communal_pool, false)) AS has_communal_pool,
  -- Sea views
  COALESCE(BOOL_OR(COALESCE(pr.sea_views, false)), COALESCE(p.has_sea_views, false)) AS has_sea_views
FROM projects p
LEFT JOIN properties pr ON pr.project_id = p.id
  AND pr.status IN ('available', 'sold')
  AND pr.costa IN ('Costa Blanca South', 'Costa Blanca South - Inland', 'Costa Calida', 'Costa Calida - Inland')
WHERE p.active = true
GROUP BY p.id;

-- Unique index on id for REFRESH CONCURRENTLY
CREATE UNIQUE INDEX idx_project_aggregations_id ON public.project_aggregations (id);
CREATE INDEX idx_project_aggregations_city ON public.project_aggregations (city);
CREATE INDEX idx_project_aggregations_region ON public.project_aggregations (region);
CREATE INDEX idx_project_aggregations_is_resale ON public.project_aggregations (is_resale);
