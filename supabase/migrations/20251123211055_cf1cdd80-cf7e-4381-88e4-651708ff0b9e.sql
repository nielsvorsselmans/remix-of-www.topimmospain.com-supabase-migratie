-- Add development_ref column to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS development_ref text;

-- Create unique index on development_ref to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_development_ref 
ON projects(development_ref) 
WHERE development_ref IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN projects.development_ref IS 'Reference ID from XML development field, used to automatically group properties into projects';