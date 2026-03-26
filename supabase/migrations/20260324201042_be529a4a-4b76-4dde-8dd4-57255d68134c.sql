
CREATE TABLE public.partner_content_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE NOT NULL,
  blog_post_id UUID REFERENCES public.blog_posts(id) ON DELETE CASCADE NOT NULL,
  share_type TEXT NOT NULL CHECK (share_type IN ('copy_link', 'linkedin')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.partner_content_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can insert own shares"
  ON public.partner_content_shares FOR INSERT TO authenticated
  WITH CHECK (partner_id IN (
    SELECT id FROM public.partners WHERE user_id = auth.uid()
  ));

CREATE POLICY "Partners can view own shares"
  ON public.partner_content_shares FOR SELECT TO authenticated
  USING (partner_id IN (
    SELECT id FROM public.partners WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all shares"
  ON public.partner_content_shares FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
