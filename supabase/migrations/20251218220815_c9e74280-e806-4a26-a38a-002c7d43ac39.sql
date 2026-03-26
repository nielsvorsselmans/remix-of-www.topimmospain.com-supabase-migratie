-- Add payment_proof_url column to sale_purchase_costs
ALTER TABLE public.sale_purchase_costs 
ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;