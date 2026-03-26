-- Create style_examples table for Style DNA system
CREATE TABLE public.style_examples (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  content_text TEXT NOT NULL,
  archetype TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable Row Level Security
ALTER TABLE public.style_examples ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users (admins only have access to admin routes anyway)
CREATE POLICY "Authenticated users can manage style examples"
ON public.style_examples
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Add comment for documentation
COMMENT ON TABLE public.style_examples IS 'Stores example posts for Style DNA system to train AI on writing style';