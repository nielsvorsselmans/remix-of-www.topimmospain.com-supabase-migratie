-- Create material_categories table for project-specific categories
CREATE TABLE public.material_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  label TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create material_rooms table for project-specific rooms
CREATE TABLE public.material_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  label TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.material_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_rooms ENABLE ROW LEVEL SECURITY;

-- RLS policies for material_categories
CREATE POLICY "Admins can manage material categories"
ON public.material_categories
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Authenticated users can view material categories"
ON public.material_categories
FOR SELECT
USING (auth.role() = 'authenticated');

-- RLS policies for material_rooms
CREATE POLICY "Admins can manage material rooms"
ON public.material_rooms
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Authenticated users can view material rooms"
ON public.material_rooms
FOR SELECT
USING (auth.role() = 'authenticated');

-- Create indexes for performance
CREATE INDEX idx_material_categories_project_id ON public.material_categories(project_id);
CREATE INDEX idx_material_rooms_project_id ON public.material_rooms(project_id);

-- Create trigger for updated_at on material_categories
CREATE TRIGGER update_material_categories_updated_at
BEFORE UPDATE ON public.material_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on material_rooms
CREATE TRIGGER update_material_rooms_updated_at
BEFORE UPDATE ON public.material_rooms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();