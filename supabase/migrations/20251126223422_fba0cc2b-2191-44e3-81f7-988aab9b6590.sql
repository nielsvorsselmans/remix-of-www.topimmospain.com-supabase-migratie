-- Create materialized view for pre-aggregated project data
CREATE MATERIALIZED VIEW IF NOT EXISTS project_aggregations AS
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
  p.priority,
  p.created_at,
  p.updated_at,
  p.active,
  -- Aggregated fields from properties
  MIN(pr.price) FILTER (WHERE pr.status = 'available') as price_from,
  MAX(pr.price) FILTER (WHERE pr.status = 'available') as price_to,
  COUNT(*) FILTER (WHERE pr.status = 'available') as available_count,
  COUNT(*) FILTER (WHERE pr.status = 'sold') as sold_count,
  COUNT(*) as total_count,
  MIN(pr.bedrooms) as min_bedrooms,
  MAX(pr.bedrooms) as max_bedrooms,
  MIN(pr.bathrooms) as min_bathrooms,
  MAX(pr.bathrooms) as max_bathrooms,
  MIN(pr.area_sqm) as min_area,
  MAX(pr.area_sqm) as max_area,
  array_agg(DISTINCT pr.property_type) FILTER (WHERE pr.property_type IS NOT NULL) as property_types,
  array_agg(DISTINCT pr.city) FILTER (WHERE pr.city IS NOT NULL) as cities,
  array_agg(pr.distance_to_beach_m) FILTER (WHERE pr.distance_to_beach_m IS NOT NULL) as distances_to_beach,
  bool_or(pr.pool OR pr.private_pool OR pr.communal_pool) as has_pool,
  bool_or(pr.private_pool) as has_private_pool,
  bool_or(pr.communal_pool) as has_communal_pool,
  bool_or(pr.sea_views) as has_sea_views
FROM projects p
LEFT JOIN properties pr ON pr.project_id = p.id 
  AND pr.status IN ('available', 'sold')
  AND pr.costa IN ('Costa Blanca South', 'Costa Blanca South - Inland', 'Costa Calida', 'Costa Calida - Inland')
WHERE p.active = true
GROUP BY p.id;

-- Create index on project_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_project_aggregations_project_id ON project_aggregations(project_id);

-- Create index on city for filtering
CREATE INDEX IF NOT EXISTS idx_project_aggregations_city ON project_aggregations(city);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_project_aggregations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW project_aggregations;
END;
$$;