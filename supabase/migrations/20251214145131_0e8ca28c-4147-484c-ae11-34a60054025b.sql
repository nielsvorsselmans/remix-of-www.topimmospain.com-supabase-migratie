-- Add property_types and property_count columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'property_types') THEN
    ALTER TABLE public.projects ADD COLUMN property_types TEXT[] DEFAULT '{}';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'property_count') THEN
    ALTER TABLE public.projects ADD COLUMN property_count INTEGER DEFAULT 0;
  END IF;
END $$;