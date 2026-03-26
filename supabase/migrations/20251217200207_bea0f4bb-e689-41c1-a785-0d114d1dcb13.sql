-- Create storage bucket for sale invoice files
INSERT INTO storage.buckets (id, name, public)
VALUES ('sale-invoices', 'sale-invoices', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policy for admins to manage invoice files
CREATE POLICY "Admins can manage invoice files"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'sale-invoices' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  bucket_id = 'sale-invoices' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);