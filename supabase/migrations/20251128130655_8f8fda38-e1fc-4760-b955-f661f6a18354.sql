-- Create meeting_knocks table for custom waiting room
CREATE TABLE public.meeting_knocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_name TEXT NOT NULL,
  guest_email TEXT,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'admitted', 'rejected')),
  knocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  admitted_at TIMESTAMPTZ,
  admitted_by UUID REFERENCES auth.users(id),
  session_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meeting_knocks ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert knock requests
CREATE POLICY "Anyone can knock"
ON public.meeting_knocks
FOR INSERT
TO public
WITH CHECK (true);

-- Allow guests to view their own knock status
CREATE POLICY "Guests can view own knock status"
ON public.meeting_knocks
FOR SELECT
TO public
USING (true);

-- Allow admins to view all knocks
CREATE POLICY "Admins can view all knocks"
ON public.meeting_knocks
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Allow admins to update knock status
CREATE POLICY "Admins can update knocks"
ON public.meeting_knocks
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Enable realtime for meeting_knocks
ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_knocks;