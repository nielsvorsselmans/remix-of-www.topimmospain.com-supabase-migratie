-- Add source_type column to project_dropbox_sources
ALTER TABLE project_dropbox_sources 
ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'dropbox' CHECK (source_type IN ('dropbox', 'sharepoint'));

-- Add sharepoint_url column to project_documents for tracking original SharePoint URLs
ALTER TABLE project_documents 
ADD COLUMN IF NOT EXISTS sharepoint_url TEXT;

-- Update sync_source constraint to include sharepoint
ALTER TABLE project_documents 
DROP CONSTRAINT IF EXISTS project_documents_sync_source_check;

ALTER TABLE project_documents 
ADD CONSTRAINT project_documents_sync_source_check 
CHECK (sync_source IN ('dropbox', 'sharepoint', 'manual'));