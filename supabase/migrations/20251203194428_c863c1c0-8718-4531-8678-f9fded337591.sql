-- Create project_dropbox_sources table
CREATE TABLE public.project_dropbox_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  dropbox_root_url TEXT NOT NULL,
  last_full_sync_at TIMESTAMP WITH TIME ZONE,
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'completed', 'failed')),
  sync_log JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id)
);

-- Create project_dropbox_folders table
CREATE TABLE public.project_dropbox_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dropbox_source_id UUID NOT NULL REFERENCES public.project_dropbox_sources(id) ON DELETE CASCADE,
  folder_url TEXT NOT NULL,
  folder_path TEXT NOT NULL,
  folder_name TEXT NOT NULL,
  folder_type TEXT NOT NULL DEFAULT 'other' CHECK (folder_type IN ('media', 'pricelist', 'documents', 'other')),
  auto_check BOOLEAN NOT NULL DEFAULT false,
  skipped BOOLEAN NOT NULL DEFAULT false,
  file_count INTEGER DEFAULT 0,
  last_checked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Extend project_documents table
ALTER TABLE public.project_documents
ADD COLUMN IF NOT EXISTS dropbox_url TEXT,
ADD COLUMN IF NOT EXISTS dropbox_modified TEXT,
ADD COLUMN IF NOT EXISTS document_date DATE,
ADD COLUMN IF NOT EXISTS is_pricelist BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS sync_source TEXT NOT NULL DEFAULT 'manual' CHECK (sync_source IN ('manual', 'dropbox'));

-- Create indexes
CREATE INDEX idx_dropbox_sources_project ON public.project_dropbox_sources(project_id);
CREATE INDEX idx_dropbox_folders_source ON public.project_dropbox_folders(dropbox_source_id);
CREATE INDEX idx_dropbox_folders_auto_check ON public.project_dropbox_folders(auto_check) WHERE auto_check = true;
CREATE INDEX idx_project_documents_pricelist ON public.project_documents(is_pricelist) WHERE is_pricelist = true;

-- Enable RLS
ALTER TABLE public.project_dropbox_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_dropbox_folders ENABLE ROW LEVEL SECURITY;

-- RLS policies for project_dropbox_sources
CREATE POLICY "Admins can manage dropbox sources"
ON public.project_dropbox_sources
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role has full access to dropbox sources"
ON public.project_dropbox_sources
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- RLS policies for project_dropbox_folders
CREATE POLICY "Admins can manage dropbox folders"
ON public.project_dropbox_folders
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role has full access to dropbox folders"
ON public.project_dropbox_folders
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Updated at trigger for project_dropbox_sources
CREATE TRIGGER update_project_dropbox_sources_updated_at
BEFORE UPDATE ON public.project_dropbox_sources
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();