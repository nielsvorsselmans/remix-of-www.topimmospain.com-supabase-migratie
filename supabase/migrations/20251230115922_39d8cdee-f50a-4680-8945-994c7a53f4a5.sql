-- Add new fields to reviews table for Google import and context-based filtering

-- Add source field to track where the review came from
ALTER TABLE public.reviews 
ADD COLUMN IF NOT EXISTS source text DEFAULT 'viva_direct';

-- Add source_review_id to prevent duplicate imports
ALTER TABLE public.reviews 
ADD COLUMN IF NOT EXISTS source_review_id text;

-- Add context_tags for page-specific filtering
ALTER TABLE public.reviews 
ADD COLUMN IF NOT EXISTS context_tags text[] DEFAULT '{}';

-- Add import_status for review approval workflow
ALTER TABLE public.reviews 
ADD COLUMN IF NOT EXISTS import_status text DEFAULT 'approved';

-- Add imported_at timestamp
ALTER TABLE public.reviews 
ADD COLUMN IF NOT EXISTS imported_at timestamp with time zone;

-- Add google_author_name to store original Google author
ALTER TABLE public.reviews 
ADD COLUMN IF NOT EXISTS google_author_name text;

-- Add google_review_time to store original Google review date
ALTER TABLE public.reviews 
ADD COLUMN IF NOT EXISTS google_review_time timestamp with time zone;

-- Add google_profile_url for attribution link
ALTER TABLE public.reviews 
ADD COLUMN IF NOT EXISTS google_profile_url text;

-- Create index on source_review_id for duplicate checking
CREATE INDEX IF NOT EXISTS idx_reviews_source_review_id ON public.reviews(source_review_id) WHERE source_review_id IS NOT NULL;

-- Create index on context_tags for efficient filtering
CREATE INDEX IF NOT EXISTS idx_reviews_context_tags ON public.reviews USING GIN(context_tags);

-- Create index on source for filtering by source
CREATE INDEX IF NOT EXISTS idx_reviews_source ON public.reviews(source);

-- Create index on import_status for admin workflow
CREATE INDEX IF NOT EXISTS idx_reviews_import_status ON public.reviews(import_status);

-- Add comment to explain the fields
COMMENT ON COLUMN public.reviews.source IS 'Source of review: viva_direct, google, trustpilot';
COMMENT ON COLUMN public.reviews.source_review_id IS 'Original review ID from external source (for deduplication)';
COMMENT ON COLUMN public.reviews.context_tags IS 'Tags for context-based filtering: financiering, hypotheek, begeleiding, regio, infoavond, aankoop, service';
COMMENT ON COLUMN public.reviews.import_status IS 'Status for imported reviews: pending_review, approved, rejected';
COMMENT ON COLUMN public.reviews.google_author_name IS 'Original author name from Google';
COMMENT ON COLUMN public.reviews.google_review_time IS 'Original review timestamp from Google';