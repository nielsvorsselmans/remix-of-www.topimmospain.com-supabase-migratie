-- Step 1: Update the constraint to also accept crm_lead_id as valid identifier
ALTER TABLE customer_profiles DROP CONSTRAINT IF EXISTS customer_profiles_identity_check;

ALTER TABLE customer_profiles ADD CONSTRAINT customer_profiles_identity_check 
CHECK (
  (user_id IS NOT NULL) OR 
  (visitor_id IS NOT NULL) OR 
  (crm_user_id IS NOT NULL) OR
  (crm_lead_id IS NOT NULL)
);

-- Step 2: Insert missing customer_profile for Michel Heyse
INSERT INTO customer_profiles (crm_lead_id, data_completeness_score)
VALUES ('9896d825-5ba1-4b45-b78a-d9e76a4925a3', 0)
ON CONFLICT DO NOTHING;