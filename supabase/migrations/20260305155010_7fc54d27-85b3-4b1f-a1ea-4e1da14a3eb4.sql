
CREATE TABLE public.project_sync_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'running',
  files_found int NOT NULL DEFAULT 0,
  files_imported int NOT NULL DEFAULT 0,
  files_failed int NOT NULL DEFAULT 0,
  error_summary text,
  details jsonb DEFAULT '[]'::jsonb,
  triggered_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_sync_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read sync history"
  ON public.project_sync_history
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert sync history"
  ON public.project_sync_history
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE INDEX idx_sync_history_project_id ON public.project_sync_history(project_id);
CREATE INDEX idx_sync_history_status ON public.project_sync_history(status);
