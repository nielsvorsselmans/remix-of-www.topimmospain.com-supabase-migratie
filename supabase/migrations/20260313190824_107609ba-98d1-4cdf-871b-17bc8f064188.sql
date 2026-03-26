
-- Recreate the sales policy using the new function
DROP POLICY IF EXISTS "Advocaat can view assigned sales" ON public.sales;
CREATE POLICY "Advocaat can view assigned sales"
  ON public.sales FOR SELECT TO authenticated
  USING (public.is_advocaat_for_sale(auth.uid(), id));

-- CRM leads policy for advocaat
DROP POLICY IF EXISTS "Advocaat can view leads for assigned sales" ON public.crm_leads;
CREATE POLICY "Advocaat can view leads for assigned sales"
  ON public.crm_leads FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sale_customers sc
      JOIN public.sale_advocaten sa ON sa.sale_id = sc.sale_id
      JOIN public.advocaten a ON a.id = sa.advocaat_id
      WHERE sc.crm_lead_id = crm_leads.id AND a.user_id = auth.uid()
    )
  );

-- Advocaat can read sale_customers for their sales
DROP POLICY IF EXISTS "Advocaat can view sale_customers for assigned sales" ON public.sale_customers;
CREATE POLICY "Advocaat can view sale_customers for assigned sales"
  ON public.sale_customers FOR SELECT TO authenticated
  USING (public.is_advocaat_for_sale(auth.uid(), sale_id));
