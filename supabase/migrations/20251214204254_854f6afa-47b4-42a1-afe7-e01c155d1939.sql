-- Create table for multiple payment proofs per payment
CREATE TABLE public.sale_payment_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.sale_payments(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  amount NUMERIC(12,2),
  notes TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sale_payment_proofs ENABLE ROW LEVEL SECURITY;

-- Admin policy
CREATE POLICY "Admins can manage payment proofs"
ON public.sale_payment_proofs
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Customer policy (view only for their sale payments)
CREATE POLICY "Customers can view their payment proofs"
ON public.sale_payment_proofs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM sale_payments sp
    JOIN sale_customers sc ON sp.sale_id = sc.sale_id
    JOIN crm_leads cl ON sc.crm_lead_id = cl.id
    WHERE sp.id = sale_payment_proofs.payment_id
    AND cl.user_id = auth.uid()
  )
);

-- Partner policy (view only for their sale payments)
CREATE POLICY "Partners can view their payment proofs"
ON public.sale_payment_proofs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM sale_payments sp
    JOIN sale_partners spart ON sp.sale_id = spart.sale_id
    JOIN partners p ON spart.partner_id = p.id
    WHERE sp.id = sale_payment_proofs.payment_id
    AND p.user_id = auth.uid()
  )
);

-- Create index for faster lookups
CREATE INDEX idx_sale_payment_proofs_payment_id ON public.sale_payment_proofs(payment_id);

-- Migrate existing proof data to new table
INSERT INTO public.sale_payment_proofs (payment_id, file_url, file_name, uploaded_at)
SELECT id, proof_file_url, proof_file_name, COALESCE(proof_uploaded_at, now())
FROM public.sale_payments
WHERE proof_file_url IS NOT NULL;