ALTER TABLE public.projects 
  ADD COLUMN IF NOT EXISTS ai_unit_descriptions jsonb DEFAULT NULL;