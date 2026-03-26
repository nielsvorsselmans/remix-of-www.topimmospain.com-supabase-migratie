-- Add customer choice and question/answer flow columns to sale_extra_categories
ALTER TABLE public.sale_extra_categories
ADD COLUMN IF NOT EXISTS customer_choice_type TEXT CHECK (customer_choice_type IN ('via_tis', 'self_arranged', 'question_pending')),
ADD COLUMN IF NOT EXISTS customer_question TEXT,
ADD COLUMN IF NOT EXISTS customer_question_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS admin_answer TEXT,
ADD COLUMN IF NOT EXISTS admin_answer_at TIMESTAMPTZ;