-- Storage bucket for voice memos
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-memos', 'voice-memos', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: only authenticated users can upload
CREATE POLICY "Authenticated users can upload voice memos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'voice-memos');

-- RLS: only authenticated users can read their own uploads
CREATE POLICY "Authenticated users can read voice memos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'voice-memos');

-- Add columns to reviews table for voice memo URL and interview data
ALTER TABLE public.reviews
ADD COLUMN IF NOT EXISTS voice_memo_url TEXT,
ADD COLUMN IF NOT EXISTS interview_data JSONB;