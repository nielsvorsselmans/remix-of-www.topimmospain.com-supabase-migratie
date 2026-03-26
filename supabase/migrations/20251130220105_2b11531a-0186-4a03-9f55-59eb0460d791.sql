-- Move materialized view to extensions schema to hide from API
ALTER MATERIALIZED VIEW project_aggregations SET SCHEMA extensions;

-- Revoke from anon to ensure no public access
REVOKE ALL ON extensions.project_aggregations FROM anon;