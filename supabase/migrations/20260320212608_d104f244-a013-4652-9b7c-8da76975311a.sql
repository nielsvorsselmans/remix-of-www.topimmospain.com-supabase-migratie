-- Fix blog_feedback: remove visitor_id branch from SELECT
DROP POLICY IF EXISTS "Users can view their own feedback" ON public.blog_feedback;
CREATE POLICY "Users can view their own feedback" ON public.blog_feedback
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all blog feedback" ON public.blog_feedback
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Fix blog_interest_analysis: drop the leaky policy (a correct one already exists)
DROP POLICY IF EXISTS "Users can view their own interest analysis" ON public.blog_interest_analysis;

-- Fix project_feedback: remove visitor_id branch from SELECT
DROP POLICY IF EXISTS "Users can view their own feedback" ON public.project_feedback;
CREATE POLICY "Users can view their own feedback" ON public.project_feedback
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Fix user_guide_progress: remove visitor_id branch from SELECT, INSERT, UPDATE
DROP POLICY IF EXISTS "Users can view own progress" ON public.user_guide_progress;
CREATE POLICY "Users can view own progress" ON public.user_guide_progress
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own progress" ON public.user_guide_progress;
CREATE POLICY "Users can insert own progress" ON public.user_guide_progress
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own progress" ON public.user_guide_progress;
CREATE POLICY "Users can update own progress" ON public.user_guide_progress
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Allow anon visitors to insert/update guide progress (no SELECT leak)
CREATE POLICY "Anon can insert guide progress" ON public.user_guide_progress
  FOR INSERT TO anon
  WITH CHECK (visitor_id IS NOT NULL AND user_id IS NULL);

CREATE POLICY "Anon can update own guide progress" ON public.user_guide_progress
  FOR UPDATE TO anon
  USING (visitor_id IS NOT NULL AND user_id IS NULL);