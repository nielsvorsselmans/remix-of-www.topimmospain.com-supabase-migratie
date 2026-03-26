-- Add priority column to sale_milestones
ALTER TABLE public.sale_milestones 
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low'));

-- Create index for efficient task overview queries
CREATE INDEX IF NOT EXISTS idx_sale_milestones_priority_deadline 
ON public.sale_milestones (priority, target_date) 
WHERE completed_at IS NULL;