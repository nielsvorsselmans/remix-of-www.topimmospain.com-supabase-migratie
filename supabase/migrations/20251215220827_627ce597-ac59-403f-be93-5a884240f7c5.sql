-- Add sale_id and crm_lead_id columns to reviews table for customer linking
ALTER TABLE public.reviews 
ADD COLUMN IF NOT EXISTS sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS crm_lead_id UUID REFERENCES public.crm_leads(id) ON DELETE SET NULL;

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_reviews_sale_id ON public.reviews(sale_id);
CREATE INDEX IF NOT EXISTS idx_reviews_crm_lead_id ON public.reviews(crm_lead_id);