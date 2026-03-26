-- Add story_content_html column to reviews to store formatted HTML stories
ALTER TABLE public.reviews
ADD COLUMN IF NOT EXISTS story_content_html text;