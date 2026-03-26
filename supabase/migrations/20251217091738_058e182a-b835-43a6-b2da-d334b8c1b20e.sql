-- Add columns for tracking actual paid amounts on extras
ALTER TABLE public.sale_extra_categories
ADD COLUMN IF NOT EXISTS actual_amount NUMERIC NULL,
ADD COLUMN IF NOT EXISTS is_finalized BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN public.sale_extra_categories.actual_amount IS 'Actual amount paid by customer (replaces estimated price when finalized)';
COMMENT ON COLUMN public.sale_extra_categories.is_finalized IS 'Whether the amount has been confirmed by customer';
COMMENT ON COLUMN public.sale_extra_categories.is_paid IS 'Whether this extra has been paid';

-- Allow customers to update their own extra amounts via sale_customers link
CREATE POLICY "Customers can update their own extra amounts"
ON public.sale_extra_categories
FOR UPDATE
USING (
  sale_id IN (
    SELECT sc.sale_id 
    FROM sale_customers sc 
    JOIN crm_leads cl ON cl.id = sc.crm_lead_id 
    WHERE cl.user_id = auth.uid()
  )
)
WITH CHECK (
  sale_id IN (
    SELECT sc.sale_id 
    FROM sale_customers sc 
    JOIN crm_leads cl ON cl.id = sc.crm_lead_id 
    WHERE cl.user_id = auth.uid()
  )
);