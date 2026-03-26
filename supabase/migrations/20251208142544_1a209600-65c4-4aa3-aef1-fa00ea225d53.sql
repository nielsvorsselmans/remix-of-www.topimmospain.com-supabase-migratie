-- Add visibility_phase column to project_documents
ALTER TABLE public.project_documents 
ADD COLUMN IF NOT EXISTS visibility_phase TEXT DEFAULT 'selection';

-- Update existing documents based on document_type
UPDATE public.project_documents
SET visibility_phase = CASE
  WHEN document_type IN ('grondplan', 'brochure', 'floorplan') THEN 'selection'
  WHEN document_type IN ('beschikbaarheid', 'availability') THEN 'viewing'
  WHEN document_type IN ('prijslijst', 'pricelist', 'specificaties', 'contract', 'technisch') THEN 'purchase'
  ELSE 'selection'
END
WHERE visibility_phase IS NULL OR visibility_phase = 'selection';

-- Add comment explaining the phases
COMMENT ON COLUMN public.project_documents.visibility_phase IS 
'Controls when document is visible to customers: selection (Selectie+), viewing (Bezichtiging+), purchase (Aankoop+), all (always visible)';