-- Create materialized view for project aggregations
CREATE MATERIALIZED VIEW IF NOT EXISTS project_aggregations AS
SELECT 
  p.id,
  p.name,
  p.display_title,
  p.location,
  p.city,
  p.region,
  p.country,
  p.latitude,
  p.longitude,
  p.description,
  p.featured_image,
  p.highlights,
  p.status,
  p.priority,
  p.completion_date,
  p.active,
  p.created_at,
  p.updated_at,
  
  -- Aggregated property data
  COUNT(CASE WHEN pr.status = 'available' THEN 1 END)::integer AS available_count,
  COUNT(pr.id)::integer AS total_count,
  
  -- Property types
  ARRAY_AGG(DISTINCT pr.property_type) FILTER (WHERE pr.property_type IS NOT NULL) AS property_types,
  
  -- Bedroom range
  MIN(pr.bedrooms) AS min_bedrooms,
  MAX(pr.bedrooms) AS max_bedrooms,
  
  -- Bathroom range
  MIN(pr.bathrooms) AS min_bathrooms,
  MAX(pr.bathrooms) AS max_bathrooms,
  
  -- Area range
  MIN(pr.area_sqm) AS min_area,
  MAX(pr.area_sqm) AS max_area,
  
  -- Price range from properties
  MIN(pr.price) AS property_min_price,
  MAX(pr.price) AS property_max_price

FROM projects p
LEFT JOIN properties pr ON pr.project_id = p.id
WHERE p.active = true
GROUP BY 
  p.id,
  p.name,
  p.display_title,
  p.location,
  p.city,
  p.region,
  p.country,
  p.latitude,
  p.longitude,
  p.description,
  p.featured_image,
  p.highlights,
  p.status,
  p.priority,
  p.completion_date,
  p.active,
  p.created_at,
  p.updated_at;

-- Create index on materialized view for better performance
CREATE INDEX IF NOT EXISTS idx_project_aggregations_city ON project_aggregations(city);
CREATE INDEX IF NOT EXISTS idx_project_aggregations_region ON project_aggregations(region);
CREATE INDEX IF NOT EXISTS idx_project_aggregations_id ON project_aggregations(id);

-- Create function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_project_aggregations()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY project_aggregations;
END;
$$ LANGUAGE plpgsql;

-- Grant select permissions
GRANT SELECT ON project_aggregations TO anon, authenticated;