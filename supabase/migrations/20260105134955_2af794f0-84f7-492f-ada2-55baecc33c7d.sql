-- Create table for learned document type mappings
CREATE TABLE public.document_type_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pattern TEXT NOT NULL,
  document_type TEXT NOT NULL,
  confidence DECIMAL(3,2) DEFAULT 1.0,
  created_by UUID REFERENCES auth.users(id),
  match_count INTEGER DEFAULT 0,
  last_matched_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique index on pattern to prevent duplicates
CREATE UNIQUE INDEX idx_document_type_mappings_pattern ON public.document_type_mappings (LOWER(pattern));

-- Enable RLS
ALTER TABLE public.document_type_mappings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read mappings
CREATE POLICY "Authenticated users can read document type mappings"
ON public.document_type_mappings
FOR SELECT
TO authenticated
USING (true);

-- Only admins can insert/update/delete (check user_roles)
CREATE POLICY "Admins can insert document type mappings"
ON public.document_type_mappings
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "Admins can update document type mappings"
ON public.document_type_mappings
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete document type mappings"
ON public.document_type_mappings
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_document_type_mappings_updated_at
BEFORE UPDATE ON public.document_type_mappings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add some initial common patterns
INSERT INTO public.document_type_mappings (pattern, document_type, confidence) VALUES
  ('disponibilidad', 'prijslijst', 1.0),
  ('memoria de calidades', 'specificaties', 1.0),
  ('memoria calidades', 'specificaties', 1.0),
  ('calendario de pagos', 'betalingsschema', 1.0),
  ('payment schedule', 'betalingsschema', 1.0),
  ('plano vivienda', 'grondplan', 1.0),
  ('plano electrico', 'elektriciteitsplan', 1.0),
  ('floor plan', 'grondplan', 1.0),
  ('contrato reserva', 'reservatiecontract', 1.0),
  ('contrato compraventa', 'koopcontract', 1.0),
  ('masterplan', 'masterplan', 1.0),
  ('site plan', 'masterplan', 1.0),
  ('ubicacion', 'masterplan', 1.0),
  ('bankgarantie', 'bankgarantie', 1.0),
  ('bank guarantee', 'bankgarantie', 1.0),
  ('garantia bancaria', 'bankgarantie', 1.0),
  ('licencia obra', 'bouwvergunning', 1.0),
  ('building permit', 'bouwvergunning', 1.0),
  ('nota simple', 'eigendomsregister', 1.0),
  ('catastro', 'kadastrale_fiche', 1.0),
  ('ficha catastral', 'kadastrale_fiche', 1.0)
ON CONFLICT DO NOTHING;