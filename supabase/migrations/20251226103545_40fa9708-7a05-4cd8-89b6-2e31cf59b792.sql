-- Add RLS policy for admins to update all customer profiles
CREATE POLICY "Admins can update all profiles"
  ON public.customer_profiles
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));