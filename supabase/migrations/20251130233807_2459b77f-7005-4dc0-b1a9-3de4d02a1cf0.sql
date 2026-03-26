-- Fix search_path for refresh function
CREATE OR REPLACE FUNCTION refresh_project_aggregations()
RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY project_aggregations;
END;
$$;