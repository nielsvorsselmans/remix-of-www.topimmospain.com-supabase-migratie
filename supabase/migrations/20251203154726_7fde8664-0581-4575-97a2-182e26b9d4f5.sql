-- Create project_documents table
CREATE TABLE public.project_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  document_type TEXT NOT NULL DEFAULT 'andere',
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  visible_public BOOLEAN DEFAULT true,
  visible_portal BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_document_type CHECK (document_type IN ('beschikbaarheidslijst', 'brochure', 'grondplan', 'masterplan', 'prijslijst', 'specificaties', 'andere'))
);

-- Enable RLS
ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can view public documents"
ON public.project_documents
FOR SELECT
USING (visible_public = true);

CREATE POLICY "Admins can manage all documents"
ON public.project_documents
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage documents"
ON public.project_documents
FOR ALL
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Create index for faster lookups
CREATE INDEX idx_project_documents_project_id ON public.project_documents(project_id);

-- Create storage bucket for project documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-documents',
  'project-documents',
  true,
  10485760,
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png']
);

-- Storage policies
CREATE POLICY "Anyone can view project documents"
ON storage.objects
FOR SELECT
USING (bucket_id = 'project-documents');

CREATE POLICY "Admins can upload project documents"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'project-documents' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update project documents"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'project-documents' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete project documents"
ON storage.objects
FOR DELETE
USING (bucket_id = 'project-documents' AND has_role(auth.uid(), 'admin'::app_role));