-- Create properties table for storing real estate data
CREATE TABLE IF NOT EXISTS public.properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic info
  title text NOT NULL,
  description text,
  price numeric(12, 2),
  
  -- Location
  address text,
  city text,
  postal_code text,
  country text DEFAULT 'Spanje',
  costa text,
  region text,
  latitude double precision,
  longitude double precision,
  distance_to_beach_m integer,
  
  -- Property details
  property_type text,
  bedrooms integer,
  bathrooms numeric(3, 1),
  area_sqm numeric(8, 2),
  plot_size_sqm numeric(10, 2),
  terrace_area_sqm numeric(8, 2),
  year_built integer,
  
  -- Features
  energy_rating text,
  parking integer DEFAULT 0,
  garden boolean DEFAULT false,
  furnished boolean DEFAULT false,
  orientation text,
  community_fees_monthly numeric(8, 2),
  
  -- Media
  image_url text,
  images jsonb DEFAULT '[]'::jsonb,
  features jsonb DEFAULT '[]'::jsonb,
  viewing_url text,
  
  -- Status & source
  status text DEFAULT 'available',
  api_source text,
  api_id text,
  
  -- Relations
  project_id uuid,
  
  -- Timestamps
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  
  -- Constraints
  CONSTRAINT unique_api_source_id UNIQUE (api_source, api_id)
);

-- Enable RLS
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view available properties"
ON public.properties FOR SELECT
USING (status = 'available' OR status = 'sold');

CREATE POLICY "Admins can manage all properties"
ON public.properties FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_properties_city ON public.properties(city);
CREATE INDEX IF NOT EXISTS idx_properties_property_type ON public.properties(property_type);
CREATE INDEX IF NOT EXISTS idx_properties_status ON public.properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_project_id ON public.properties(project_id);
CREATE INDEX IF NOT EXISTS idx_properties_price ON public.properties(price);
CREATE INDEX IF NOT EXISTS idx_properties_api_source_id ON public.properties(api_source, api_id);
CREATE INDEX IF NOT EXISTS idx_properties_latitude ON public.properties(latitude) WHERE latitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_properties_longitude ON public.properties(longitude) WHERE longitude IS NOT NULL;

-- Add update trigger
CREATE TRIGGER update_properties_updated_at
BEFORE UPDATE ON public.properties
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();