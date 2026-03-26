-- Fix CRM lead linking by handling duplicates properly
-- Step 1: For crm_user_ids that already exist in customer_profiles,
-- just add the visitor_id from crm_leads to linked_visitor_ids
UPDATE customer_profiles cp
SET 
  linked_visitor_ids = array_append(
    COALESCE(cp.linked_visitor_ids, ARRAY[]::text[]),
    cl.visitor_id
  ),
  updated_at = NOW()
FROM crm_leads cl
WHERE cp.crm_user_id = cl.crm_user_id
  AND cl.visitor_id IS NOT NULL
  AND NOT (cl.visitor_id = ANY(COALESCE(cp.linked_visitor_ids, ARRAY[]::text[])))
  AND cl.visitor_id != cp.visitor_id;

-- Step 2: For profiles that don't have crm_user_id yet,
-- but the crm_user_id doesn't exist elsewhere, link it
UPDATE customer_profiles cp
SET 
  crm_user_id = cl.crm_user_id,
  updated_at = NOW()
FROM crm_leads cl
WHERE cp.visitor_id = cl.visitor_id
  AND cp.crm_user_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM customer_profiles cp2
    WHERE cp2.crm_user_id = cl.crm_user_id
  );