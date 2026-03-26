
-- Helper function for storage: check if advocaat can access a sale document by object name
CREATE OR REPLACE FUNCTION public.is_sale_document_advocaat(object_name text, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM sale_advocaten sa
    JOIN advocaten a ON a.id = sa.advocaat_id
    WHERE a.user_id = user_uuid
      AND sa.sale_id = split_part(object_name, '/', 1)::uuid
  );
$$;

-- 1. Advocaat can view documents for assigned sales
CREATE POLICY "Advocaat can view documents for assigned sales"
ON public.sale_documents FOR SELECT TO authenticated
USING (public.is_advocaat_for_sale(auth.uid(), sale_id));

-- 2. Advocaat can insert documents for assigned sales
CREATE POLICY "Advocaat can upload documents for assigned sales"
ON public.sale_documents FOR INSERT TO authenticated
WITH CHECK (public.is_advocaat_for_sale(auth.uid(), sale_id));

-- 3. Advocaat can upload files to sale-documents storage bucket
CREATE POLICY "Advocaat can upload to sale-documents storage"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'sale-documents'
  AND public.is_sale_document_advocaat(name, auth.uid())
);

-- 4. Advocaat can view files in sale-documents storage bucket
CREATE POLICY "Advocaat can view sale-documents storage"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'sale-documents'
  AND public.is_sale_document_advocaat(name, auth.uid())
);
