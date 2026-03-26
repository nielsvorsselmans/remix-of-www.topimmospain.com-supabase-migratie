-- Fix STORAGE_EXPOSURE: Sale documents accessible to any authenticated user
-- Drop the overly permissive policy that allows any authenticated user to view all documents
DROP POLICY IF EXISTS "Authenticated users can view sale documents" ON storage.objects;

-- Create a helper function to check if a user owns a sale document (via sale_customers)
CREATE OR REPLACE FUNCTION public.is_sale_document_owner(object_name text, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM sale_documents sd
    JOIN sale_customers sc ON sc.sale_id = sd.sale_id
    JOIN crm_leads cl ON cl.id = sc.crm_lead_id
    WHERE sd.file_url LIKE '%' || object_name || '%'
    AND cl.user_id = user_uuid
  );
$$;

-- Create a helper function to check if a user is a partner on the sale
CREATE OR REPLACE FUNCTION public.is_sale_document_partner(object_name text, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM sale_documents sd
    JOIN sale_partners sp ON sp.sale_id = sd.sale_id
    JOIN partners p ON p.id = sp.partner_id
    WHERE sd.file_url LIKE '%' || object_name || '%'
    AND p.user_id = user_uuid
  );
$$;

-- Policy: Customers can view their own sale documents
CREATE POLICY "Customers can view their own sale documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'sale-documents' AND
  public.is_sale_document_owner(name, auth.uid())
);

-- Policy: Partners can view documents for sales they're linked to
CREATE POLICY "Partners can view their sale documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'sale-documents' AND
  public.is_sale_document_partner(name, auth.uid())
);