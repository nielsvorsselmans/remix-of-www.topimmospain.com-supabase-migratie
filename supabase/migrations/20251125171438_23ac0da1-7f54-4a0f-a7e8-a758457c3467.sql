-- Create visitor_preferences table for anonymous user tracking
CREATE TABLE IF NOT EXISTS public.visitor_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT UNIQUE NOT NULL,
  
  -- Viewed projects with attributes (array of objects)
  viewed_projects JSONB DEFAULT '[]'::jsonb,
  
  -- Inferred preferences (calculated from viewing behavior)
  inferred_budget_min NUMERIC,
  inferred_budget_max NUMERIC,
  inferred_cities TEXT[] DEFAULT ARRAY[]::text[],
  inferred_regions TEXT[] DEFAULT ARRAY[]::text[],
  inferred_bedrooms INTEGER[] DEFAULT ARRAY[]::integer[],
  
  -- Filter behavior (same structure as user_preferences)
  last_used_cities TEXT[] DEFAULT ARRAY[]::text[],
  last_used_property_types TEXT[] DEFAULT ARRAY[]::text[],
  last_price_range_min NUMERIC,
  last_price_range_max NUMERIC,
  last_bedrooms_filter INTEGER[] DEFAULT ARRAY[]::integer[],
  filter_update_count INTEGER DEFAULT 0,
  
  -- Metadata
  first_visit_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_visit_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  total_views INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.visitor_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read their own visitor preferences (by visitor_id in query)
CREATE POLICY "Anyone can read visitor preferences"
  ON public.visitor_preferences
  FOR SELECT
  USING (true);

-- Policy: Anyone can insert visitor preferences
CREATE POLICY "Anyone can insert visitor preferences"
  ON public.visitor_preferences
  FOR INSERT
  WITH CHECK (true);

-- Policy: Anyone can update visitor preferences
CREATE POLICY "Anyone can update visitor preferences"
  ON public.visitor_preferences
  FOR UPDATE
  USING (true);

-- Create index for faster lookups
CREATE INDEX idx_visitor_preferences_visitor_id ON public.visitor_preferences(visitor_id);
CREATE INDEX idx_visitor_preferences_last_visit ON public.visitor_preferences(last_visit_at);

-- Add trigger for updated_at
CREATE TRIGGER update_visitor_preferences_updated_at
  BEFORE UPDATE ON public.visitor_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();