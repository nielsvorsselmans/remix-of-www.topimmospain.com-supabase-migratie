-- Fix project_briefing_analyses: drop all broken policies and replace with admin-only
DROP POLICY IF EXISTS "Admins can view briefing analyses" ON public.project_briefing_analyses;
DROP POLICY IF EXISTS "Admins can insert briefing analyses" ON public.project_briefing_analyses;
DROP POLICY IF EXISTS "Admins can update briefing analyses" ON public.project_briefing_analyses;
DROP POLICY IF EXISTS "Admins can delete briefing analyses" ON public.project_briefing_analyses;
DROP POLICY IF EXISTS "Admin full access to briefing analyses" ON public.project_briefing_analyses;

CREATE POLICY "Admins can manage briefing analyses"
  ON public.project_briefing_analyses
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Fix lead_nurture_actions: drop all broken policies and replace with admin-only
DROP POLICY IF EXISTS "Admins can view nurture actions" ON public.lead_nurture_actions;
DROP POLICY IF EXISTS "Admins can insert nurture actions" ON public.lead_nurture_actions;
DROP POLICY IF EXISTS "Admins can update nurture actions" ON public.lead_nurture_actions;
DROP POLICY IF EXISTS "Admins can delete nurture actions" ON public.lead_nurture_actions;
DROP POLICY IF EXISTS "Admin full access to nurture actions" ON public.lead_nurture_actions;
DROP POLICY IF EXISTS "Authenticated users can view nurture actions" ON public.lead_nurture_actions;
DROP POLICY IF EXISTS "Authenticated users can insert nurture actions" ON public.lead_nurture_actions;
DROP POLICY IF EXISTS "Authenticated users can update nurture actions" ON public.lead_nurture_actions;
DROP POLICY IF EXISTS "Authenticated users can delete nurture actions" ON public.lead_nurture_actions;

CREATE POLICY "Admins can manage nurture actions"
  ON public.lead_nurture_actions
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));