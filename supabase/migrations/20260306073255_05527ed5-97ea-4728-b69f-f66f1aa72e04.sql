
-- Table for companion notes per viewing
CREATE TABLE public.viewing_companion_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.customer_viewing_trips(id) ON DELETE CASCADE,
  viewing_id text NOT NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  note_text text DEFAULT '',
  media jsonb DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint: one note per viewing per trip
ALTER TABLE public.viewing_companion_notes ADD CONSTRAINT unique_trip_viewing UNIQUE (trip_id, viewing_id);

-- RLS
ALTER TABLE public.viewing_companion_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on viewing_companion_notes"
ON public.viewing_companion_notes
FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Storage bucket for media
INSERT INTO storage.buckets (id, name, public)
VALUES ('viewing-companion-media', 'viewing-companion-media', false);

-- Storage RLS: admin-only upload/read/delete
CREATE POLICY "Admin upload viewing companion media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'viewing-companion-media'
  AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admin read viewing companion media"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'viewing-companion-media'
  AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admin delete viewing companion media"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'viewing-companion-media'
  AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
