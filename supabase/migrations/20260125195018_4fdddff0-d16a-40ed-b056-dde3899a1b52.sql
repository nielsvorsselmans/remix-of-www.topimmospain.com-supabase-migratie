-- Create travel guide categories table
CREATE TABLE public.travel_guide_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_singular TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'MapPin',
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create travel guide POIs table
CREATE TABLE public.travel_guide_pois (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.travel_guide_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  municipality TEXT NOT NULL,
  region TEXT NOT NULL DEFAULT 'Costa Cálida',
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  google_maps_url TEXT,
  google_place_id TEXT,
  phone TEXT,
  website TEXT,
  opening_hours JSONB,
  tips TEXT,
  is_recommended BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  source TEXT NOT NULL DEFAULT 'manual',
  featured_image TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.travel_guide_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_guide_pois ENABLE ROW LEVEL SECURITY;

-- RLS policies for categories (admin only via has_role)
CREATE POLICY "Admins can manage categories"
ON public.travel_guide_categories
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for POIs (admin only via has_role)
CREATE POLICY "Admins can manage POIs"
ON public.travel_guide_pois
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Indexes for performance
CREATE INDEX idx_travel_guide_pois_category ON public.travel_guide_pois(category_id);
CREATE INDEX idx_travel_guide_pois_municipality ON public.travel_guide_pois(municipality);
CREATE INDEX idx_travel_guide_pois_region ON public.travel_guide_pois(region);
CREATE INDEX idx_travel_guide_pois_active ON public.travel_guide_pois(is_active);

-- Update trigger for timestamps
CREATE TRIGGER update_travel_guide_categories_updated_at
BEFORE UPDATE ON public.travel_guide_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_travel_guide_pois_updated_at
BEFORE UPDATE ON public.travel_guide_pois
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed categories with appropriate icons
INSERT INTO public.travel_guide_categories (name, name_singular, icon, sort_order, description) VALUES
('Stranden', 'Strand', 'Waves', 1, 'De mooiste stranden in de regio'),
('Golfterreinen', 'Golfterrein', 'Flag', 2, 'Golfbanen voor elk niveau'),
('Restaurants & Bars', 'Restaurant', 'UtensilsCrossed', 3, 'Culinaire hotspots en gezellige terrassen'),
('Wekelijkse Markten', 'Markt', 'ShoppingBasket', 4, 'Lokale markten met verse producten'),
('Winkelcentra', 'Winkelcentrum', 'ShoppingBag', 5, 'Grote winkelcentra en shopping areas'),
('Supermarkten', 'Supermarkt', 'Store', 6, 'Supermarkten en buurtwinkels'),
('Ziekenhuizen & Klinieken', 'Ziekenhuis', 'Hospital', 7, 'Medische voorzieningen'),
('Marina''s & Jachthavens', 'Marina', 'Anchor', 8, 'Havens en watersport faciliteiten'),
('Culturele Bezienswaardigheden', 'Bezienswaardigheid', 'Landmark', 9, 'Musea, monumenten en historische sites'),
('Wellness & Spa', 'Wellness', 'Sparkles', 10, 'Ontspanning en verzorging'),
('Expat Communities', 'Expat Community', 'Users', 11, 'Ontmoetingsplekken voor expats'),
('Praktische Diensten', 'Dienst', 'Briefcase', 12, 'Notaris, bank, advocaat en meer');