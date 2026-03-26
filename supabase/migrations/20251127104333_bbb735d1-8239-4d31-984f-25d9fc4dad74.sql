-- Add extended partner data fields for enriched profiles
ALTER TABLE public.partners
ADD COLUMN years_experience INTEGER,
ADD COLUMN team_size INTEGER,
ADD COLUMN office_locations JSONB DEFAULT '[]'::jsonb,
ADD COLUMN testimonials JSONB DEFAULT '[]'::jsonb,
ADD COLUMN statistics JSONB DEFAULT '{}'::jsonb,
ADD COLUMN media_mentions JSONB DEFAULT '[]'::jsonb,
ADD COLUMN specializations JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.partners.years_experience IS 'Number of years in business';
COMMENT ON COLUMN public.partners.team_size IS 'Number of team members';
COMMENT ON COLUMN public.partners.office_locations IS 'Array of office location objects {city, address}';
COMMENT ON COLUMN public.partners.testimonials IS 'Array of client testimonial objects {quote, author}';
COMMENT ON COLUMN public.partners.statistics IS 'Key figures object {label, value}';
COMMENT ON COLUMN public.partners.media_mentions IS 'Array of media mention objects {source, title, url}';
COMMENT ON COLUMN public.partners.specializations IS 'Array of specialization strings';