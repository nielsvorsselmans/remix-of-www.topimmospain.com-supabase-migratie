
-- Create snagging_voice_recordings table
CREATE TABLE public.snagging_voice_recordings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  room_name TEXT NOT NULL,
  audio_url TEXT,
  storage_path TEXT,
  transcript TEXT,
  ai_items JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.snagging_voice_recordings ENABLE ROW LEVEL SECURITY;

-- RLS policies - authenticated users can CRUD
CREATE POLICY "Authenticated users can read voice recordings"
  ON public.snagging_voice_recordings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert voice recordings"
  ON public.snagging_voice_recordings FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update voice recordings"
  ON public.snagging_voice_recordings FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete voice recordings"
  ON public.snagging_voice_recordings FOR DELETE TO authenticated USING (true);

-- Create storage bucket for voice recordings
INSERT INTO storage.buckets (id, name, public) VALUES ('snagging-voice', 'snagging-voice', false);

-- Storage RLS policies
CREATE POLICY "Authenticated users can upload voice files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'snagging-voice');

CREATE POLICY "Authenticated users can read voice files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'snagging-voice');

CREATE POLICY "Authenticated users can delete voice files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'snagging-voice');
