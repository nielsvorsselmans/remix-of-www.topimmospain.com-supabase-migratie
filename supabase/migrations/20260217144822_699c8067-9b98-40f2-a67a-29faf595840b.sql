DROP VIEW IF EXISTS public.public_sales;

CREATE VIEW public.public_sales
WITH (security_invoker = off) AS
SELECT
  s.id AS sale_id,
  s.status,
  s.property_description,
  p.name AS project_name,
  p.display_title AS project_display_title,
  p.city AS project_city,
  p.region AS project_region,
  p.featured_image AS project_featured_image,
  p.images AS project_images,
  p.description AS project_description,
  p.latitude AS project_latitude,
  p.longitude AS project_longitude,
  p.price_from AS project_price_from,
  p.price_to AS project_price_to,
  p.min_bedrooms AS project_min_bedrooms,
  p.max_bedrooms AS project_max_bedrooms,
  p.property_types AS project_property_types,
  p.property_count AS project_property_count,
  p.completion_date AS project_completion_date,
  p.is_resale AS project_is_resale,
  p.highlights AS project_highlights,
  p.location_intelligence AS project_location_intelligence,
  pr.title AS property_title,
  pr.price AS property_price,
  pr.property_type,
  pr.bedrooms, pr.bathrooms, pr.area_sqm,
  pr.plot_size_sqm, pr.terrace_area_sqm,
  pr.city AS property_city, pr.region AS property_region,
  pr.costa AS property_costa,
  pr.latitude, pr.longitude, pr.distance_to_beach_m,
  pr.image_url AS property_image_url,
  pr.images AS property_images,
  pr.features AS property_features,
  pr.pool, pr.communal_pool, pr.private_pool,
  pr.garden, pr.garage AS parking,
  pr.sea_views, pr.mountain_views,
  pr.airconditioning, pr.heating,
  pr.new_build, pr.key_ready
FROM sales s
LEFT JOIN projects p ON p.id = s.project_id
LEFT JOIN properties pr ON pr.id = s.property_id
WHERE s.status <> 'geannuleerd'
  AND p.publish_to_rentals = true;

GRANT SELECT ON public.public_sales TO anon, authenticated;