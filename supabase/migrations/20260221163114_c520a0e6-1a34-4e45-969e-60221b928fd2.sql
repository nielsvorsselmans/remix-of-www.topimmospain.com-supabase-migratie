-- Drop existing INSERT policy and replace with rate-limited version
DROP POLICY IF EXISTS "Customers can insert if self-service enabled" ON public.external_listing_submissions;

CREATE POLICY "Customers can insert if self-service enabled"
ON public.external_listing_submissions
FOR INSERT
WITH CHECK (
  submitted_by_user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM crm_leads
    WHERE crm_leads.id = external_listing_submissions.crm_lead_id
    AND crm_leads.user_id = auth.uid()
    AND crm_leads.can_submit_external_urls = true
  )
  AND (
    SELECT COUNT(*) FROM external_listing_submissions els
    WHERE els.submitted_by_user_id = auth.uid()
    AND els.created_at > now() - interval '24 hours'
  ) < 5
);