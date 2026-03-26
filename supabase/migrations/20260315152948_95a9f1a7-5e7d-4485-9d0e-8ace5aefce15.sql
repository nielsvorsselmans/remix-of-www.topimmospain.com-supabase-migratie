ALTER TABLE public.sale_milestones 
ADD COLUMN prerequisite_for UUID REFERENCES public.sale_milestones(id) ON DELETE SET NULL DEFAULT NULL;