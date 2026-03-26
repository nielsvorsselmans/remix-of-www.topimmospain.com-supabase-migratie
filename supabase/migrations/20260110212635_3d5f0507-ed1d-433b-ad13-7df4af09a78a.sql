-- Add content_item_id column to social_posts table to link scheduled posts to content items
ALTER TABLE public.social_posts 
ADD COLUMN content_item_id uuid REFERENCES public.content_items(id);

-- Create index for efficient lookups
CREATE INDEX idx_social_posts_content_item ON public.social_posts(content_item_id);