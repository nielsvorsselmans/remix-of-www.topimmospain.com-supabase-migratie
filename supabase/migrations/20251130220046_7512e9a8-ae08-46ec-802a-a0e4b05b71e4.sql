-- Move extensions from public schema to extensions schema
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move pg_stat_statements extension if it exists in public
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension 
    WHERE extname = 'pg_stat_statements' 
    AND extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    ALTER EXTENSION pg_stat_statements SET SCHEMA extensions;
  END IF;
END $$;

-- For materialized view: revoke direct API access and grant only to authenticated users
REVOKE ALL ON project_aggregations FROM anon;
GRANT SELECT ON project_aggregations TO authenticated;