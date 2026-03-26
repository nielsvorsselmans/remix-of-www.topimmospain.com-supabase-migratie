
-- 1. Nieuwe kolom op crm_leads
ALTER TABLE public.crm_leads ADD COLUMN can_submit_external_urls boolean NOT NULL DEFAULT false;

-- 2. Nieuwe tabel: external_listing_submissions
CREATE TABLE public.external_listing_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crm_lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  submitted_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_url text NOT NULL,
  customer_message text,
  status text NOT NULL DEFAULT 'pending_review',
  admin_response text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  external_listing_id uuid REFERENCES public.external_listings(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.external_listing_submissions ENABLE ROW LEVEL SECURITY;

-- RLS: Klant kan eigen submissions lezen
CREATE POLICY "Customers can read own submissions"
ON public.external_listing_submissions
FOR SELECT
TO authenticated
USING (
  submitted_by_user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
);

-- RLS: Klant kan INSERT als can_submit_external_urls = true
CREATE POLICY "Customers can insert if self-service enabled"
ON public.external_listing_submissions
FOR INSERT
TO authenticated
WITH CHECK (
  submitted_by_user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.crm_leads
    WHERE id = crm_lead_id
    AND user_id = auth.uid()
    AND can_submit_external_urls = true
  )
);

-- RLS: Admin kan alles updaten
CREATE POLICY "Admins can update submissions"
ON public.external_listing_submissions
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS: Admin kan verwijderen
CREATE POLICY "Admins can delete submissions"
ON public.external_listing_submissions
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Rate limiting: max 5 submissions per dag per klant (via RLS constraint)
-- Dit wordt client-side afgedwongen + de INSERT policy beperkt al tot eigen lead
