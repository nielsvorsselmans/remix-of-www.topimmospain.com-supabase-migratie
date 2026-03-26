-- Update the customer_choice_type column to include 'gift_accepted' option
-- First, drop the existing check constraint if it exists
ALTER TABLE public.sale_extra_categories 
DROP CONSTRAINT IF EXISTS sale_extra_categories_customer_choice_type_check;

-- Add new check constraint that includes 'gift_accepted'
ALTER TABLE public.sale_extra_categories 
ADD CONSTRAINT sale_extra_categories_customer_choice_type_check 
CHECK (customer_choice_type IN ('via_tis', 'self_arranged', 'question_pending', 'gift_accepted'));