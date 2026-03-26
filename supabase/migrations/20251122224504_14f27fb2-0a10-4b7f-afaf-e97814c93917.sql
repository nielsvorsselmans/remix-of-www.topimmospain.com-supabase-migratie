-- Drop trigger first (if exists)
DROP TRIGGER IF EXISTS trigger_auto_link_property ON properties;
DROP FUNCTION IF EXISTS trigger_auto_link_property() CASCADE;

-- Drop tables that are no longer needed (data now comes from external API)
DROP TABLE IF EXISTS project_qualification_flows CASCADE;
DROP TABLE IF EXISTS properties CASCADE;
DROP TABLE IF EXISTS projects CASCADE;