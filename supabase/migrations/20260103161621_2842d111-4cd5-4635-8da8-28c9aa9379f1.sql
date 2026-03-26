-- Drop LinkedIn tables (all are empty, verified before deletion)
DROP TABLE IF EXISTS linkedin_api_logs;
DROP TABLE IF EXISTS linkedin_posts;
DROP VIEW IF EXISTS linkedin_connections_safe;
DROP TABLE IF EXISTS linkedin_connections;