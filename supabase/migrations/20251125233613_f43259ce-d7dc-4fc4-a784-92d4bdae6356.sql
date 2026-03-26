-- Add summary field to blog_posts for AI citations and featured snippets
ALTER TABLE public.blog_posts
ADD COLUMN summary text;

COMMENT ON COLUMN public.blog_posts.summary IS 'Korte samenvatting (2-3 zinnen) met direct antwoord op de hoofdvraag. Geoptimaliseerd voor AI citaties en Google featured snippets.';