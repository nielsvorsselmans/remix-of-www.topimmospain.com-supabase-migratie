ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS social_snippet text;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS card_subtitle text;