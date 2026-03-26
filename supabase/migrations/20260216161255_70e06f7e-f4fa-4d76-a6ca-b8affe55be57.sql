
-- Stap 1: Nieuw veld publish_to_rentals op projects
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS publish_to_rentals BOOLEAN NOT NULL DEFAULT false;

-- Actieve projecten initieel op true zetten
UPDATE public.projects SET publish_to_rentals = true WHERE active = true;

-- Stap 2: View public_projects (security definer)
CREATE OR REPLACE VIEW public.public_projects
WITH (security_invoker = off) AS
SELECT
  id AS project_id,
  name,
  display_title,
  description,
  highlights,
  city,
  region,
  country,
  latitude,
  longitude,
  price_from,
  price_to,
  featured_image,
  images,
  property_types,
  min_bedrooms,
  max_bedrooms,
  property_count,
  status,
  completion_date,
  is_resale
FROM public.projects
WHERE active = true AND publish_to_rentals = true;

GRANT SELECT ON public.public_projects TO anon, authenticated;

-- Stap 3: View public_units (security definer)
CREATE OR REPLACE VIEW public.public_units
WITH (security_invoker = off) AS
SELECT
  pr.id AS unit_id,
  pr.project_id,
  pr.title,
  pr.description,
  pr.price,
  pr.city,
  pr.region,
  pr.costa,
  pr.property_type,
  pr.bedrooms,
  pr.bathrooms,
  pr.area_sqm,
  pr.plot_size_sqm,
  pr.terrace_area_sqm,
  pr.usable_area_sqm,
  pr.image_url,
  pr.images,
  pr.features,
  pr.status,
  pr.pool,
  pr.private_pool,
  pr.communal_pool,
  pr.parking,
  pr.garage,
  pr.garden,
  pr.elevator,
  pr.airconditioning,
  pr.sea_views,
  pr.mountain_views,
  pr.garden_views,
  pr.pool_views,
  pr.open_views,
  pr.orientation,
  pr.floor,
  pr.total_floors,
  pr.new_build,
  pr.key_ready,
  pr.off_plan,
  pr.delivery_date,
  pr.year_built,
  pr.energy_rating,
  pr.distance_to_beach_m,
  pr.distance_to_golf_m,
  pr.distance_to_airport_km,
  pr.distance_to_shops_m,
  pr.video_url,
  pr.virtual_tour_url,
  pr.latitude,
  pr.longitude
FROM public.properties pr
WHERE pr.status = 'available'
  AND pr.project_id IN (
    SELECT id FROM public.projects WHERE active = true AND publish_to_rentals = true
  );

GRANT SELECT ON public.public_units TO anon, authenticated;

-- Stap 4: public_sales updaten met publish_to_rentals filter
CREATE OR REPLACE VIEW public.public_sales
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
  p.images AS project_images
FROM sales s
LEFT JOIN projects p ON p.id = s.project_id
WHERE s.status <> 'geannuleerd'::sale_status
  AND p.publish_to_rentals = true;
