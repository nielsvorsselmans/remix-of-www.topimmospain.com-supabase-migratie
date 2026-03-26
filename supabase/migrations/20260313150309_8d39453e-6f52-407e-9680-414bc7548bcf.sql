ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS video_skipped boolean NOT NULL DEFAULT false;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS photos_skipped boolean NOT NULL DEFAULT false;