ALTER TABLE public.project_dropbox_sources 
  DROP CONSTRAINT IF EXISTS project_dropbox_sources_sync_status_check;

ALTER TABLE public.project_dropbox_sources 
  ADD CONSTRAINT project_dropbox_sources_sync_status_check 
  CHECK (sync_status = ANY (ARRAY[
    'pending'::text, 'syncing'::text, 'syncing_v2'::text, 'processing'::text, 
    'completed'::text, 'completed_with_errors'::text, 'failed'::text, 'cancelled'::text
  ]));