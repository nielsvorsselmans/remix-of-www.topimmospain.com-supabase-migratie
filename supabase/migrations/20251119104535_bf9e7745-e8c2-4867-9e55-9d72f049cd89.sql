-- Create table for orientation call requests
CREATE TABLE public.orientation_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID,
  property_title TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  message TEXT,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.orientation_requests ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert orientation requests (public form)
CREATE POLICY "Anyone can submit orientation requests"
ON public.orientation_requests
FOR INSERT
WITH CHECK (true);

-- Admins can view all requests
CREATE POLICY "Admins can view all orientation requests"
ON public.orientation_requests
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own requests if logged in
CREATE POLICY "Users can view own orientation requests"
ON public.orientation_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can update requests
CREATE POLICY "Admins can update orientation requests"
ON public.orientation_requests
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete requests
CREATE POLICY "Admins can delete orientation requests"
ON public.orientation_requests
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_orientation_requests_updated_at
BEFORE UPDATE ON public.orientation_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_orientation_requests_created_at ON public.orientation_requests(created_at DESC);
CREATE INDEX idx_orientation_requests_email ON public.orientation_requests(email);