-- Klanten mogen een project_selection aanmaken voor hun eigen crm_lead
CREATE POLICY "Customers can insert own selections"
ON public.customer_project_selections
FOR INSERT
TO authenticated
WITH CHECK (
  crm_lead_id IN (
    SELECT id FROM public.crm_leads WHERE user_id = auth.uid()
  )
);