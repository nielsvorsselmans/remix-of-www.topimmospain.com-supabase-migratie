
ALTER TABLE public.external_listings ADD COLUMN scrape_status text DEFAULT 'success';
ALTER TABLE public.external_listings ADD COLUMN scrape_error text;
ALTER TABLE public.external_listings ADD COLUMN last_scrape_attempt timestamptz;
