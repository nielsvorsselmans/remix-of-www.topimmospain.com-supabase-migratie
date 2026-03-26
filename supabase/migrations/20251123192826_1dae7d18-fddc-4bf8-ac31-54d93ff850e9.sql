-- Update projects table to match CSV structure
-- Check if table exists and create/update accordingly

-- Drop existing if needed and recreate with all fields
DROP TABLE IF EXISTS public.projects CASCADE;

CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic info
  project_key text UNIQUE,
  name text NOT NULL,
  display_title text,
  description text,
  highlights jsonb DEFAULT '[]'::jsonb,
  
  -- Location
  location text,
  city text,
  region text,
  country text DEFAULT 'Spanje',
  latitude double precision,
  longitude double precision,
  
  -- Pricing
  price_from numeric(12, 2),
  price_to numeric(12, 2),
  
  -- Media
  featured_image text,
  showhouse_video_url text,
  environment_video_url text,
  
  -- Status
  status text DEFAULT 'active',
  active boolean DEFAULT true,
  completion_date date,
  
  -- Timestamps
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view active projects"
ON public.projects FOR SELECT
USING (active = true);

CREATE POLICY "Admins can manage all projects"
ON public.projects FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_projects_project_key ON public.projects(project_key);
CREATE INDEX IF NOT EXISTS idx_projects_city ON public.projects(city);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_active ON public.projects(active);
CREATE INDEX IF NOT EXISTS idx_projects_price_from ON public.projects(price_from);
CREATE INDEX IF NOT EXISTS idx_projects_latitude ON public.projects(latitude) WHERE latitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_longitude ON public.projects(longitude) WHERE longitude IS NOT NULL;

-- Add update trigger
CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update properties table to add foreign key to projects if not exists
ALTER TABLE public.properties 
  DROP CONSTRAINT IF EXISTS properties_project_id_fkey;

ALTER TABLE public.properties
  ADD CONSTRAINT properties_project_id_fkey 
  FOREIGN KEY (project_id) 
  REFERENCES public.projects(id) 
  ON DELETE SET NULL;