-- Drop the incorrectly scoped policy that grants ALL to any authenticated user
DROP POLICY IF EXISTS "Admin full access to request attachments" ON public.customization_request_attachments;

-- Create an admin-only replacement using the has_role function
CREATE POLICY "Admins can manage request attachments"
  ON public.customization_request_attachments
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));