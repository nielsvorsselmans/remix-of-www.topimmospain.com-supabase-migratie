
-- Groep 1: Basis woninggegevens
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS min_bathrooms integer,
  ADD COLUMN IF NOT EXISTS max_bathrooms integer,
  ADD COLUMN IF NOT EXISTS min_area numeric,
  ADD COLUMN IF NOT EXISTS max_area numeric,
  ADD COLUMN IF NOT EXISTS plot_size_sqm numeric,
  ADD COLUMN IF NOT EXISTS terrace_area_sqm numeric,
  ADD COLUMN IF NOT EXISTS floor integer,
  ADD COLUMN IF NOT EXISTS total_floors integer,
  ADD COLUMN IF NOT EXISTS year_built integer,
  ADD COLUMN IF NOT EXISTS orientation text,
  ADD COLUMN IF NOT EXISTS energy_rating text,
  ADD COLUMN IF NOT EXISTS parking integer;

-- Groep 2: Locatie en afstanden
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS costa text,
  ADD COLUMN IF NOT EXISTS distance_to_beach_m integer,
  ADD COLUMN IF NOT EXISTS distance_to_golf_m integer,
  ADD COLUMN IF NOT EXISTS distance_to_airport_km numeric,
  ADD COLUMN IF NOT EXISTS distance_to_shops_m integer;

-- Groep 3: Kenmerken (booleans)
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS has_pool boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_private_pool boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_communal_pool boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_garage boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_elevator boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_airconditioning boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_heating boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_fireplace boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_alarm boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_basement boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_storage_room boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_solarium boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_garden boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_furnished boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_key_ready boolean DEFAULT false;

-- Groep 4: Uitzicht (booleans)
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS has_sea_views boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_mountain_views boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_garden_views boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_pool_views boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_open_views boolean DEFAULT false;

-- Groep 5: Kosten
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS community_fees_monthly numeric,
  ADD COLUMN IF NOT EXISTS ibi_tax_yearly numeric,
  ADD COLUMN IF NOT EXISTS garbage_tax_yearly numeric;
