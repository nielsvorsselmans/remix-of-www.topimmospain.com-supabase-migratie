-- Revoke all permissions on materialized view from public access
-- This prevents the view from being accessible via the Data API
REVOKE ALL ON project_aggregations FROM anon, authenticated;
REVOKE ALL ON project_aggregations FROM PUBLIC;

-- Grant select only to service_role (for edge functions)
GRANT SELECT ON project_aggregations TO service_role;