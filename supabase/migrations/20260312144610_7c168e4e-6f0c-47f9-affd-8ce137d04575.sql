
-- Fix existing reviews with has_full_story = true but no story_slug
UPDATE public.reviews
SET story_slug = lower(
  regexp_replace(
    regexp_replace(
      translate(customer_name, 'àáâãäåèéêëìíîïòóôõöùúûüýÿñçÀÁÂÃÄÅÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÝŸÑÇ', 'aaaaaaeeeeiiiioooooouuuuyyncAAAAAAEEEEIIIIOOOOOUUUUYYNC'),
      '[^a-zA-Z0-9\s-]', '', 'g'
    ),
    '\s+', '-', 'g'
  )
)
WHERE has_full_story = true AND (story_slug IS NULL OR story_slug = '');
