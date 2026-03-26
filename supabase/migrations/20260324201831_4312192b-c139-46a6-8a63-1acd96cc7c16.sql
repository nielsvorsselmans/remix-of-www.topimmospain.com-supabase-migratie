CREATE TABLE public.partner_content_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES partners(id) ON DELETE CASCADE NOT NULL,
  blog_post_id UUID REFERENCES blog_posts(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'shared',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (partner_id, blog_post_id)
);

ALTER TABLE public.partner_content_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can insert own content status"
  ON partner_content_status FOR INSERT TO authenticated
  WITH CHECK (partner_id IN (
    SELECT id FROM partners WHERE user_id = auth.uid()
  ));

CREATE POLICY "Partners can view own content status"
  ON partner_content_status FOR SELECT TO authenticated
  USING (partner_id IN (
    SELECT id FROM partners WHERE user_id = auth.uid()
  ));

CREATE POLICY "Partners can update own content status"
  ON partner_content_status FOR UPDATE TO authenticated
  USING (partner_id IN (
    SELECT id FROM partners WHERE user_id = auth.uid()
  ))
  WITH CHECK (partner_id IN (
    SELECT id FROM partners WHERE user_id = auth.uid()
  ));

CREATE POLICY "Partners can delete own content status"
  ON partner_content_status FOR DELETE TO authenticated
  USING (partner_id IN (
    SELECT id FROM partners WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all content status"
  ON partner_content_status FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));