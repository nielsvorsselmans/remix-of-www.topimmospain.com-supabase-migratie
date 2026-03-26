UPDATE public.crm_leads 
SET referred_by_partner_id = '9cc6463b-ed37-4b55-b5f2-441891b826b2'
WHERE referred_by_partner_id IS NULL 
  AND created_at > now() - interval '1 hour';