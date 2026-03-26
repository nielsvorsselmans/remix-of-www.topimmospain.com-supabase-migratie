-- Phase 3: Add RLS policies for customer_profiles via crm_lead_id
-- Users can view their profile if their user_id is linked to the crm_lead

CREATE POLICY "Users can view profile via crm_lead" ON customer_profiles
FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM crm_leads 
    WHERE crm_leads.id = customer_profiles.crm_lead_id 
    AND crm_leads.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update profile via crm_lead" ON customer_profiles
FOR UPDATE
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM crm_leads 
    WHERE crm_leads.id = customer_profiles.crm_lead_id 
    AND crm_leads.user_id = auth.uid()
  )
);