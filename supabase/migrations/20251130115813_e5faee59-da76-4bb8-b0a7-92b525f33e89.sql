-- Fix duplicate customer_profiles by merging based on overlapping visitor_ids
-- Strategy: Delete CRM-only profiles first, then update user profiles

-- Step 1: Update the identity check constraint to allow multiple identity fields
ALTER TABLE customer_profiles DROP CONSTRAINT IF EXISTS customer_profiles_identity_check;

ALTER TABLE customer_profiles ADD CONSTRAINT customer_profiles_identity_check 
  CHECK (
    (user_id IS NOT NULL) OR 
    (visitor_id IS NOT NULL) OR 
    (crm_user_id IS NOT NULL)
  );

-- Step 2: Create temp table to store merge information before deletion
CREATE TEMP TABLE merge_info AS
SELECT DISTINCT
  cp_user.id as user_profile_id,
  cp_user.user_id,
  cp_crm.id as crm_profile_id,
  cp_crm.crm_user_id,
  COALESCE(cp_user.linked_visitor_ids, '{}') || COALESCE(cp_crm.linked_visitor_ids, '{}') as merged_visitor_ids
FROM customer_profiles cp_user
JOIN customer_profiles cp_crm ON cp_crm.crm_user_id IS NOT NULL
  AND cp_crm.user_id IS NULL
WHERE cp_user.user_id IS NOT NULL
  AND cp_user.linked_visitor_ids && cp_crm.linked_visitor_ids;

-- Step 3: Link crm_leads to user_id
UPDATE crm_leads cl
SET 
  user_id = mi.user_id,
  updated_at = NOW()
FROM merge_info mi
WHERE cl.crm_user_id = mi.crm_user_id
  AND cl.user_id IS NULL;

-- Step 4: Delete duplicate CRM-only profiles
DELETE FROM customer_profiles
WHERE id IN (SELECT crm_profile_id FROM merge_info);

-- Step 5: Update user profiles with crm_user_id and merged visitor_ids
UPDATE customer_profiles cp
SET 
  crm_user_id = mi.crm_user_id,
  linked_visitor_ids = (
    SELECT ARRAY(SELECT DISTINCT unnest(mi.merged_visitor_ids))
  ),
  updated_at = NOW()
FROM merge_info mi
WHERE cp.id = mi.user_profile_id;

-- Clean up temp table
DROP TABLE merge_info;