-- Drop the existing constraint
ALTER TABLE project_documents 
DROP CONSTRAINT IF EXISTS valid_document_type;

-- Add updated constraint that accepts both Dutch and English variants
ALTER TABLE project_documents 
ADD CONSTRAINT valid_document_type CHECK (
  document_type = ANY (ARRAY[
    'beschikbaarheidslijst',
    'brochure', 
    'floorplan',
    'grondplan',
    'masterplan',
    'pricelist',
    'prijslijst',
    'specificaties',
    'video_link',
    'andere'
  ])
);