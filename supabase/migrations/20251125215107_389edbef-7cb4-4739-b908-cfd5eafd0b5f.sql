-- Geef Lars admin toegang
INSERT INTO public.user_roles (user_id, role)
VALUES ('97659fe0-8c91-49b3-b275-5517c2c0ffa2', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;