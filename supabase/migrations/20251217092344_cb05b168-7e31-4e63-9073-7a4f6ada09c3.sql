-- Klanten mogen actual_amount updaten voor hun eigen aankoopkosten
CREATE POLICY "Customers can update their own purchase cost amounts"
  ON public.sale_purchase_costs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM sale_customers sc
      JOIN crm_leads cl ON cl.id = sc.crm_lead_id
      WHERE sc.sale_id = sale_purchase_costs.sale_id
        AND cl.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sale_customers sc
      JOIN crm_leads cl ON cl.id = sc.crm_lead_id
      WHERE sc.sale_id = sale_purchase_costs.sale_id
        AND cl.user_id = auth.uid()
    )
  );