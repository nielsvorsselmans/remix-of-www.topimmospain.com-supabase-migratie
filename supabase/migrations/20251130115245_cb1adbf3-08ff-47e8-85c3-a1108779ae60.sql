-- Create missing customer_profiles for existing crm_leads
INSERT INTO customer_profiles (crm_user_id, linked_visitor_ids, created_at, updated_at)
SELECT 
  cl.crm_user_id,
  cl.linked_visitor_ids,
  cl.created_at,
  NOW()
FROM crm_leads cl
WHERE cl.crm_user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM customer_profiles cp 
    WHERE cp.crm_user_id = cl.crm_user_id
  )
ON CONFLICT (crm_user_id) DO NOTHING;

-- Synchronize linked_visitor_ids from crm_leads to customer_profiles
UPDATE customer_profiles cp
SET 
  linked_visitor_ids = (
    SELECT ARRAY(
      SELECT DISTINCT unnest(
        COALESCE(cp.linked_visitor_ids, '{}') || 
        COALESCE(cl.linked_visitor_ids, '{}')
      )
    )
  ),
  updated_at = NOW()
FROM crm_leads cl
WHERE cp.crm_user_id = cl.crm_user_id
  AND cl.linked_visitor_ids IS NOT NULL
  AND cl.linked_visitor_ids != '{}';

-- Trigger re-aggregation for all CRM profiles to populate engagement data
DO $$
DECLARE
  profile_record RECORD;
BEGIN
  FOR profile_record IN 
    SELECT crm_user_id, visitor_id 
    FROM customer_profiles 
    WHERE crm_user_id IS NOT NULL
  LOOP
    PERFORM aggregate_customer_profile(NULL, profile_record.visitor_id, profile_record.crm_user_id);
  END LOOP;
END $$;