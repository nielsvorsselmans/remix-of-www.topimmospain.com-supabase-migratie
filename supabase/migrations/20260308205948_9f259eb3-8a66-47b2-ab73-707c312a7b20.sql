ALTER TABLE public.viewing_companion_notes 
ADD COLUMN IF NOT EXISTS rating integer,
ADD COLUMN IF NOT EXISTS interest_level text,
ADD COLUMN IF NOT EXISTS budget_fit boolean,
ADD COLUMN IF NOT EXISTS follow_up_action text;