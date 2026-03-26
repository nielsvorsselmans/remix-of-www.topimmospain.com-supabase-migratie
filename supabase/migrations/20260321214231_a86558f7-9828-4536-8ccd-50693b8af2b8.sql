ALTER TABLE public.social_posts ADD COLUMN blog_post_id UUID REFERENCES public.blog_posts(id) ON DELETE SET NULL;

CREATE INDEX idx_social_posts_blog_post_id ON public.social_posts(blog_post_id);