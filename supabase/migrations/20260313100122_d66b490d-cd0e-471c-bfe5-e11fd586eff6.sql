
CREATE OR REPLACE FUNCTION public.get_city_project_counts()
RETURNS TABLE(city text, project_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT city, COUNT(*) as project_count
  FROM project_aggregations
  WHERE city IS NOT NULL
  GROUP BY city
  ORDER BY project_count DESC;
$$;
