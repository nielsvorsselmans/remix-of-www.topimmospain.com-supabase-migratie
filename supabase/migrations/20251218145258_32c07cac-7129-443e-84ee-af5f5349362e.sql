-- Stap 1: Extend crm_leads met persoonlijke data velden
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS street_address TEXT;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS residence_city TEXT;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Nederland';
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS tax_id_bsn TEXT;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS tax_id_nie TEXT;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS nationality TEXT;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS personal_data_complete BOOLEAN DEFAULT false;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS personal_data_completed_at TIMESTAMPTZ;

-- Stap 2: Maak customer_identity_documents tabel
CREATE TABLE IF NOT EXISTS public.customer_identity_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crm_lead_id UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('passport', 'nie_document')),
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customer_identity_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies voor customer_identity_documents
CREATE POLICY "Admins can manage customer identity documents"
ON public.customer_identity_documents
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage customer identity documents"
ON public.customer_identity_documents
FOR ALL
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

CREATE POLICY "Users can view their own identity documents"
ON public.customer_identity_documents
FOR SELECT
USING (
  crm_lead_id IN (
    SELECT id FROM public.crm_leads WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own identity documents"
ON public.customer_identity_documents
FOR INSERT
WITH CHECK (
  crm_lead_id IN (
    SELECT id FROM public.crm_leads WHERE user_id = auth.uid()
  )
);

-- Index voor snelle lookups
CREATE INDEX IF NOT EXISTS idx_customer_identity_documents_crm_lead_id 
ON public.customer_identity_documents(crm_lead_id);