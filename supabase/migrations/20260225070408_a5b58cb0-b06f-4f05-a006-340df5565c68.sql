
-- Add is_featured boolean to blog_posts for editorial curation
ALTER TABLE public.blog_posts 
ADD COLUMN is_featured BOOLEAN NOT NULL DEFAULT false;

-- Create index for quick featured post lookups
CREATE INDEX idx_blog_posts_is_featured ON public.blog_posts (is_featured) WHERE is_featured = true;
