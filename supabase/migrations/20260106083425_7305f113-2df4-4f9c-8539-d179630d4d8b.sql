-- Add INSERT policy for admins on customer_profiles
CREATE POLICY "Admins can insert profiles"
  ON public.customer_profiles
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add DELETE policy for admins on customer_profiles
CREATE POLICY "Admins can delete profiles"
  ON public.customer_profiles
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));