
-- Add scheduled_at to blog_posts
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS scheduled_at timestamptz DEFAULT NULL;

-- Create seo_keyword_cache table
CREATE TABLE IF NOT EXISTS public.seo_keyword_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword text NOT NULL,
  search_volume integer,
  cpc numeric,
  competition numeric,
  competition_level text,
  language_code text NOT NULL DEFAULT 'nl',
  location_code integer NOT NULL DEFAULT 2528,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(keyword, language_code, location_code)
);

-- Allow public read (no auth needed for cache lookups)
ALTER TABLE public.seo_keyword_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read seo cache" ON public.seo_keyword_cache FOR SELECT USING (true);
CREATE POLICY "Service role can insert seo cache" ON public.seo_keyword_cache FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can update seo cache" ON public.seo_keyword_cache FOR UPDATE USING (true);
