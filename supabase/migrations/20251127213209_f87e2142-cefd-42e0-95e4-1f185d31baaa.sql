-- Drop en recreate de materialized view met correcte geografische filtering
DROP MATERIALIZED VIEW IF EXISTS project_aggregations;

CREATE MATERIALIZED VIEW project_aggregations AS
SELECT 
  p.id as project_id,
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
  COALESCE(p.priority, 0) as priority,
  p.created_at,
  p.updated_at,
  -- Aggregated from allowed costa properties only
  MIN(pr.price) as price_from,
  MAX(pr.price) as price_to,
  ARRAY_AGG(DISTINCT pr.property_type) FILTER (WHERE pr.property_type IS NOT NULL) as property_types,
  COUNT(pr.id) as total_count,
  COUNT(pr.id) FILTER (WHERE pr.status = 'available') as available_count,
  COUNT(pr.id) FILTER (WHERE pr.status = 'sold') as sold_count,
  MIN(pr.bedrooms) as min_bedrooms,
  MAX(pr.bedrooms) as max_bedrooms,
  MIN(pr.bathrooms) as min_bathrooms,
  MAX(pr.bathrooms) as max_bathrooms,
  MIN(pr.area_sqm) as min_area,
  MAX(pr.area_sqm) as max_area,
  ARRAY_AGG(DISTINCT pr.city) FILTER (WHERE pr.city IS NOT NULL) as cities,
  ARRAY_AGG(DISTINCT pr.distance_to_beach_m) FILTER (WHERE pr.distance_to_beach_m IS NOT NULL) as distances_to_beach,
  bool_or(pr.pool IS NOT NULL) as has_pool,
  bool_or(pr.private_pool) as has_private_pool,
  bool_or(pr.communal_pool) as has_communal_pool,
  bool_or(pr.sea_views) as has_sea_views
FROM projects p
INNER JOIN properties pr ON pr.project_id = p.id 
  AND pr.status IN ('available', 'sold')
  AND pr.costa IN ('Costa Blanca South', 'Costa Blanca South - Inland', 'Costa Calida', 'Costa Calida - Inland')
WHERE p.active = true
GROUP BY p.id
HAVING COUNT(pr.id) > 0;