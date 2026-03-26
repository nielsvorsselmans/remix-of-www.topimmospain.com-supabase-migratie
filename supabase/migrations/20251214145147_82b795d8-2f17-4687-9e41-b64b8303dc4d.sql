-- Update existing projects with correct metadata from their properties
UPDATE public.projects p
SET 
  price_from = COALESCE(sub.min_price, p.price_from),
  price_to = COALESCE(sub.max_price, p.price_to),
  min_bedrooms = sub.min_beds,
  max_bedrooms = sub.max_beds,
  property_types = COALESCE(sub.types, '{}'),
  property_count = COALESCE(sub.count, 0)
FROM (
  SELECT 
    project_id,
    MIN(price) FILTER (WHERE price > 0 AND status != 'sold') as min_price,
    MAX(price) FILTER (WHERE price > 0 AND status != 'sold') as max_price,
    MIN(bedrooms) FILTER (WHERE bedrooms > 0 AND status != 'sold') as min_beds,
    MAX(bedrooms) FILTER (WHERE bedrooms > 0 AND status != 'sold') as max_beds,
    ARRAY_AGG(DISTINCT property_type) FILTER (WHERE property_type IS NOT NULL AND status != 'sold') as types,
    COUNT(*) FILTER (WHERE status != 'sold') as count
  FROM public.properties
  WHERE project_id IS NOT NULL
  GROUP BY project_id
) sub
WHERE p.id = sub.project_id;