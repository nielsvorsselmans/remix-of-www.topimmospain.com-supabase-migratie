
-- 1. Cleanup: drop overbodige views
DROP VIEW IF EXISTS public.public_projects;
DROP VIEW IF EXISTS public.public_units;

-- 2. Vervang public_sales met uitgebreide versie
CREATE OR REPLACE VIEW public.public_sales
WITH (security_invoker = off) AS
SELECT
  s.id AS sale_id,
  s.status,
  s.property_description,
  -- Project info
  p.name AS project_name,
  p.display_title AS project_display_title,
  p.city AS project_city,
  p.region AS project_region,
  p.featured_image AS project_featured_image,
  p.images AS project_images,
  -- Property info
  pr.title AS property_title,
  pr.price AS property_price,
  pr.property_type,
  pr.bedrooms,
  pr.bathrooms,
  pr.area_sqm,
  pr.plot_size_sqm,
  pr.terrace_area_sqm,
  pr.city AS property_city,
  pr.region AS property_region,
  pr.costa AS property_costa,
  pr.latitude,
  pr.longitude,
  pr.distance_to_beach_m,
  pr.image_url AS property_image_url,
  pr.images AS property_images,
  pr.features AS property_features,
  pr.pool,
  pr.communal_pool,
  pr.private_pool,
  pr.garden,
  pr.garage AS parking,
  pr.sea_views,
  pr.mountain_views,
  pr.airconditioning,
  pr.heating,
  pr.new_build,
  pr.key_ready
FROM sales s
LEFT JOIN projects p ON p.id = s.project_id
LEFT JOIN properties pr ON pr.id = s.property_id
WHERE s.status <> 'geannuleerd'
  AND p.publish_to_rentals = true;

-- 3. Grants behouden
GRANT SELECT ON public.public_sales TO anon, authenticated;
