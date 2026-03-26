-- Create reservation_details table for storing buyer-specific reservation data
CREATE TABLE public.reservation_details (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_customer_id UUID NOT NULL UNIQUE REFERENCES public.sale_customers(id) ON DELETE CASCADE,
  street_address TEXT,
  postal_code TEXT,
  city TEXT,
  country TEXT DEFAULT 'Nederland',
  tax_id_bsn TEXT,
  tax_id_nie TEXT,
  nationality TEXT,
  date_of_birth DATE,
  data_complete BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reservation_documents table for passport copies and other ID documents
CREATE TABLE public.reservation_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_detail_id UUID NOT NULL REFERENCES public.reservation_details(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL DEFAULT 'passport',
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reservation_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for reservation_details
CREATE POLICY "Admins can manage reservation details"
ON public.reservation_details
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage reservation details"
ON public.reservation_details
FOR ALL
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- RLS policies for reservation_documents
CREATE POLICY "Admins can manage reservation documents"
ON public.reservation_documents
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage reservation documents"
ON public.reservation_documents
FOR ALL
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Create storage bucket for reservation documents (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('reservation-documents', 'reservation-documents', false);

-- Storage policies for reservation-documents bucket
CREATE POLICY "Admins can upload reservation documents"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'reservation-documents' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view reservation documents"
ON storage.objects
FOR SELECT
USING (bucket_id = 'reservation-documents' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete reservation documents"
ON storage.objects
FOR DELETE
USING (bucket_id = 'reservation-documents' AND has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_reservation_details_updated_at
BEFORE UPDATE ON public.reservation_details
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();