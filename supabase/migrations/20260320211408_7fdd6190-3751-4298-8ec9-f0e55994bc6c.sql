-- Drop the overly permissive public ALL policy
DROP POLICY IF EXISTS "System can manage interest analysis" ON public.blog_interest_analysis;

-- Service role can manage all records (used by edge functions/cleanup)
CREATE POLICY "Service role can manage interest analysis"
  ON public.blog_interest_analysis FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Authenticated users can read their own analysis
CREATE POLICY "Users view own interest analysis"
  ON public.blog_interest_analysis FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Admins can read all
CREATE POLICY "Admins can manage interest analysis"
  ON public.blog_interest_analysis FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));