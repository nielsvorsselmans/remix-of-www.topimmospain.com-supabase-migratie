-- Geef Lars admin toegang
-- NOTE(P2): skips silently if auth user does not exist yet; re-grant manually after Phase 2 user migration
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = '97659fe0-8c91-49b3-b275-5517c2c0ffa2') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES ('97659fe0-8c91-49b3-b275-5517c2c0ffa2', 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;