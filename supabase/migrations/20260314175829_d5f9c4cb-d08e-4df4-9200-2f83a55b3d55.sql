
CREATE TABLE public.info_evening_waitlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  notified BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.info_evening_waitlist ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (public waitlist signup)
CREATE POLICY "Anyone can join waitlist" ON public.info_evening_waitlist
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Only authenticated users with admin role can read/update
CREATE POLICY "Admins can view waitlist" ON public.info_evening_waitlist
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update waitlist" ON public.info_evening_waitlist
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
