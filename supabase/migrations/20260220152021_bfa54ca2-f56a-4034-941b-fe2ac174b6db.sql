
-- Step 1: Create both tables
CREATE TABLE public.external_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES auth.users(id),
  source_url text NOT NULL,
  source_platform text NOT NULL DEFAULT 'idealista',
  title text,
  price numeric,
  currency text DEFAULT 'EUR',
  city text,
  region text,
  bedrooms integer,
  bathrooms integer,
  area_sqm numeric,
  plot_size_sqm numeric,
  description text,
  features jsonb DEFAULT '{}',
  images text[] DEFAULT '{}',
  raw_scraped_data jsonb,
  scraped_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.external_listing_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_listing_id uuid NOT NULL REFERENCES public.external_listings(id) ON DELETE CASCADE,
  crm_lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'suggested' CHECK (status IN ('suggested', 'interested', 'to_visit', 'visited', 'rejected')),
  admin_notes text,
  customer_notes text,
  assigned_by uuid REFERENCES auth.users(id),
  assigned_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(external_listing_id, crm_lead_id)
);

-- Step 2: Enable RLS
ALTER TABLE public.external_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_listing_assignments ENABLE ROW LEVEL SECURITY;

-- Step 3: Policies for external_listings
CREATE POLICY "Admins can manage external_listings"
ON public.external_listings FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Customers can view assigned external_listings"
ON public.external_listings FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.external_listing_assignments ela
    JOIN public.crm_leads cl ON cl.id = ela.crm_lead_id
    WHERE ela.external_listing_id = external_listings.id
    AND cl.user_id = auth.uid()
  )
);

-- Step 4: Policies for external_listing_assignments
CREATE POLICY "Admins can manage external_listing_assignments"
ON public.external_listing_assignments FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Customers can view own external_listing_assignments"
ON public.external_listing_assignments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.crm_leads cl
    WHERE cl.id = external_listing_assignments.crm_lead_id
    AND cl.user_id = auth.uid()
  )
);

CREATE POLICY "Customers can update own assignment notes/status"
ON public.external_listing_assignments FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.crm_leads cl
    WHERE cl.id = external_listing_assignments.crm_lead_id
    AND cl.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.crm_leads cl
    WHERE cl.id = external_listing_assignments.crm_lead_id
    AND cl.user_id = auth.uid()
  )
);
