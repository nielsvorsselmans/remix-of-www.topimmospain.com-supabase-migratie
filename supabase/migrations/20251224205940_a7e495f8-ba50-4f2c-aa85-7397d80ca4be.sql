-- Add RLS policy for admins to view all user favorites
CREATE POLICY "Admins can view all user favorites"
  ON public.user_favorites FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Add RLS policy for partners to view favorites of their referred leads
CREATE POLICY "Partners can view favorites of their leads"
  ON public.user_favorites FOR SELECT
  USING (
    user_id IN (
      SELECT cl.user_id 
      FROM public.crm_leads cl
      WHERE cl.referred_by_partner_id IN (
        SELECT p.id FROM public.partners p WHERE p.user_id = auth.uid()
      )
    )
  );