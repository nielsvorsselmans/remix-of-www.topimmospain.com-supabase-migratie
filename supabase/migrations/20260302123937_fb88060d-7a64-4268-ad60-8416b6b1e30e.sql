
-- Create snagging_photos table for photo metadata
CREATE TABLE public.snagging_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  snagging_item_id UUID NOT NULL REFERENCES public.snagging_items(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  storage_path TEXT,
  notes TEXT,
  room TEXT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_by_name TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.snagging_photos ENABLE ROW LEVEL SECURITY;

-- RLS policies: authenticated users can CRUD (admin-only feature)
CREATE POLICY "Authenticated users can view snagging photos"
  ON public.snagging_photos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert snagging photos"
  ON public.snagging_photos FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update snagging photos"
  ON public.snagging_photos FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete snagging photos"
  ON public.snagging_photos FOR DELETE TO authenticated USING (true);

-- Index for faster lookups
CREATE INDEX idx_snagging_photos_item_id ON public.snagging_photos(snagging_item_id);
