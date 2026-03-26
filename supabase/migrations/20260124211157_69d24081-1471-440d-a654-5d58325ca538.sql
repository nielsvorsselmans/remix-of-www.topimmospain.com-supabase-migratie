-- Create location category settings table for dynamic configuration
CREATE TABLE public.location_category_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_type TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  label_singular TEXT NOT NULL,
  icon TEXT DEFAULT NULL,
  radius_meters INTEGER NOT NULL DEFAULT 5000,
  max_results INTEGER NOT NULL DEFAULT 5,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.location_category_settings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated admins to manage settings (public read for edge functions)
CREATE POLICY "Anyone can read location category settings"
ON public.location_category_settings
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can manage location category settings"
ON public.location_category_settings
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Seed with current categories (active) and new suggestions (inactive)
INSERT INTO public.location_category_settings (google_type, label, label_singular, icon, radius_meters, max_results, sort_order, is_active) VALUES
  ('beach', 'Stranden', 'Strand', 'waves', 5000, 5, 1, true),
  ('golf_course', 'Golfbanen', 'Golfbaan', 'flag', 15000, 5, 2, true),
  ('supermarket', 'Supermarkten', 'Supermarkt', 'shopping-cart', 2000, 5, 3, true),
  ('restaurant', 'Restaurants', 'Restaurant', 'utensils', 1000, 5, 4, true),
  ('hospital', 'Ziekenhuizen', 'Ziekenhuis', 'building-2', 15000, 5, 5, true),
  ('airport', 'Luchthavens', 'Luchthaven', 'plane', 60000, 5, 6, true),
  ('school', 'Scholen', 'School', 'graduation-cap', 3000, 5, 7, false),
  ('train_station', 'Treinstations', 'Treinstation', 'train-front', 15000, 5, 8, false),
  ('shopping_mall', 'Winkelcentra', 'Winkelcentrum', 'store', 10000, 5, 9, false),
  ('marina', 'Marinas', 'Marina', 'anchor', 10000, 5, 10, false);

-- Create trigger for updated_at
CREATE TRIGGER update_location_category_settings_updated_at
BEFORE UPDATE ON public.location_category_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();