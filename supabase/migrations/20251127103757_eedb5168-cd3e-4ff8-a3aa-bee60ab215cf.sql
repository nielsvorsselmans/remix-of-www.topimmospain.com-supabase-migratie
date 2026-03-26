-- Create table for storing scraped partner data
CREATE TABLE IF NOT EXISTS public.partner_scraped_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE,
  website_url TEXT NOT NULL,
  scraped_content TEXT NOT NULL,
  extracted_data JSONB DEFAULT '{}'::jsonb,
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.partner_scraped_data ENABLE ROW LEVEL SECURITY;

-- Admins can manage scraped data
CREATE POLICY "Admins can manage partner scraped data"
ON public.partner_scraped_data
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster lookups
CREATE INDEX idx_partner_scraped_data_partner_id ON public.partner_scraped_data(partner_id);
CREATE INDEX idx_partner_scraped_data_website_url ON public.partner_scraped_data(website_url);