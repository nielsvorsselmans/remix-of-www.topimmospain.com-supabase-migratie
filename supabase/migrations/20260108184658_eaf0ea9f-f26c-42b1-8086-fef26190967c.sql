-- Step 1: Remove duplicate customer_profiles, keeping the oldest record for each crm_lead_id
DELETE FROM public.customer_profiles 
WHERE id NOT IN (
  SELECT MIN(id::text)::uuid
  FROM public.customer_profiles 
  WHERE crm_lead_id IS NOT NULL
  GROUP BY crm_lead_id
)
AND crm_lead_id IS NOT NULL;

-- Step 2: Add unique constraint on crm_lead_id
ALTER TABLE public.customer_profiles
ADD CONSTRAINT customer_profiles_crm_lead_id_key UNIQUE (crm_lead_id);