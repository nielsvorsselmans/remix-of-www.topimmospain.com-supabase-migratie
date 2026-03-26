-- Add RLS policy for partners to view developer invoices for their linked sales
CREATE POLICY "Partners can view developer invoices for their linked sales"
ON public.sale_invoices FOR SELECT
USING (
  invoice_type = 'developer'
  AND partner_visible = true
  AND sale_id IN (
    SELECT sp.sale_id FROM sale_partners sp
    JOIN partners p ON p.id = sp.partner_id
    WHERE p.user_id = auth.uid()
  )
);