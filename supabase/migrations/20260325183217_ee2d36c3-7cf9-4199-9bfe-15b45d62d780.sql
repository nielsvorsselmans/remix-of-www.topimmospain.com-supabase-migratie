CREATE POLICY "Users can update own crm_lead name"
ON crm_leads
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);