-- Fix 1: lead_nurture_actions - SELECT policy should be admin-only
ALTER POLICY "Admins can view all nurture actions" ON public.lead_nurture_actions
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Fix 2: aftersales_ai_messages - restrict to admin only
DROP POLICY IF EXISTS "Authenticated users can manage aftersales AI messages" ON public.aftersales_ai_messages;
CREATE POLICY "Admins can manage aftersales AI messages" ON public.aftersales_ai_messages
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Fix 3: question_answers - restrict all operations to admin only
DROP POLICY IF EXISTS "Authenticated users can read question_answers" ON public.question_answers;
DROP POLICY IF EXISTS "Authenticated users can insert question_answers" ON public.question_answers;
DROP POLICY IF EXISTS "Authenticated users can update question_answers" ON public.question_answers;
DROP POLICY IF EXISTS "Authenticated users can delete question_answers" ON public.question_answers;

CREATE POLICY "Admins can manage question_answers" ON public.question_answers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));