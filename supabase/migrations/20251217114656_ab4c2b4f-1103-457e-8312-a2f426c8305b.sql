-- Add quote workflow columns to sale_customization_requests
ALTER TABLE public.sale_customization_requests
ADD COLUMN IF NOT EXISTS quote_requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS quote_url TEXT,
ADD COLUMN IF NOT EXISTS quote_amount NUMERIC,
ADD COLUMN IF NOT EXISTS quote_uploaded_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS customer_decision TEXT CHECK (customer_decision IN ('accepted', 'rejected')),
ADD COLUMN IF NOT EXISTS customer_decision_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS customer_decision_reason TEXT,
ADD COLUMN IF NOT EXISTS add_to_costs BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_due_moment TEXT DEFAULT 'bij_oplevering',
ADD COLUMN IF NOT EXISTS linked_purchase_cost_id UUID REFERENCES public.sale_purchase_costs(id);

-- Update status check constraint to include new statuses
ALTER TABLE public.sale_customization_requests 
DROP CONSTRAINT IF EXISTS sale_customization_requests_status_check;

ALTER TABLE public.sale_customization_requests
ADD CONSTRAINT sale_customization_requests_status_check 
CHECK (status IN ('pending', 'discussed', 'quote_requested', 'quote_received', 'approved', 'rejected'));