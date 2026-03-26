-- Add phase and template_key columns to sale_milestones
ALTER TABLE public.sale_milestones
ADD COLUMN IF NOT EXISTS phase text,
ADD COLUMN IF NOT EXISTS template_key text;

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_sale_milestones_phase ON public.sale_milestones(phase);
CREATE INDEX IF NOT EXISTS idx_sale_milestones_template_key ON public.sale_milestones(template_key);

-- Add comment for documentation
COMMENT ON COLUMN public.sale_milestones.phase IS 'Phase/chapter this milestone belongs to: reservatie, contract, financiering, notaris, oplevering, nazorg';
COMMENT ON COLUMN public.sale_milestones.template_key IS 'Template identifier for automatic checklist generation (e.g., res_koperdata, res_contract_upload)';