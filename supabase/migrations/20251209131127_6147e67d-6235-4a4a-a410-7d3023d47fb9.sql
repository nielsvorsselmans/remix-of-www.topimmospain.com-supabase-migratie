-- Allow users to read their own crm_lead record (for journey_phase access in portal)
CREATE POLICY "Users can view their own crm_lead" 
ON crm_leads 
FOR SELECT 
USING (auth.uid() = user_id);