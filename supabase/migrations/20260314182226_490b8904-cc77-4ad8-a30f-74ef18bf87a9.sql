CREATE OR REPLACE FUNCTION public.get_city_project_counts()
RETURNS TABLE(city text, project_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT city, COUNT(*) as project_count
  FROM project_aggregations
  WHERE city IS NOT NULL
    AND (total_count > 0 OR is_resale = true)
  GROUP BY city
  ORDER BY project_count DESC;
$$;