
CREATE VIEW public_sales AS
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
WHERE s.status != 'geannuleerd';

GRANT SELECT ON public_sales TO anon;
GRANT SELECT ON public_sales TO authenticated;
