ALTER TABLE public.sale_choices
  ADD COLUMN IF NOT EXISTS waiting_since timestamptz,
  ADD COLUMN IF NOT EXISTS waiting_for text;

ALTER TABLE public.sale_payments
  ADD COLUMN IF NOT EXISTS waiting_since timestamptz,
  ADD COLUMN IF NOT EXISTS waiting_for text;