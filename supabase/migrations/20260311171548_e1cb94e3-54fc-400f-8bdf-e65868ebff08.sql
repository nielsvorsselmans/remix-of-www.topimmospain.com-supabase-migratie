ALTER TABLE public.sale_milestones 
  ADD COLUMN IF NOT EXISTS waiting_since timestamptz,
  ADD COLUMN IF NOT EXISTS waiting_for text;