-- ==========================================
-- Partner klant bewerkingsrechten + automatische journey fase updates
-- ==========================================

-- 1. RLS policy voor partners om contactgegevens te kunnen updaten
-- Partners mogen alleen hun eigen gekoppelde klanten bewerken

CREATE POLICY "Partners can update their referred leads contact info"
ON public.crm_leads
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.partners p
    WHERE p.user_id = auth.uid()
    AND p.id = crm_leads.referred_by_partner_id
    AND p.active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.partners p
    WHERE p.user_id = auth.uid()
    AND p.id = crm_leads.referred_by_partner_id
    AND p.active = true
  )
);

-- 2. RLS policy voor partners om customer_profiles te kunnen updaten
CREATE POLICY "Partners can update customer profiles of their referred leads"
ON public.customer_profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.crm_leads cl
    JOIN public.partners p ON p.id = cl.referred_by_partner_id
    WHERE cl.id = customer_profiles.crm_lead_id
    AND p.user_id = auth.uid()
    AND p.active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.crm_leads cl
    JOIN public.partners p ON p.id = cl.referred_by_partner_id
    WHERE cl.id = customer_profiles.crm_lead_id
    AND p.user_id = auth.uid()
    AND p.active = true
  )
);

-- 3. RLS policy voor partners om customer_profiles aan te maken (als die nog niet bestaat)
CREATE POLICY "Partners can insert customer profiles for their referred leads"
ON public.customer_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.crm_leads cl
    JOIN public.partners p ON p.id = cl.referred_by_partner_id
    WHERE cl.id = crm_lead_id
    AND p.user_id = auth.uid()
    AND p.active = true
  )
);

-- 4. RLS policy voor partners om bezichtigingsreizen aan te maken
CREATE POLICY "Partners can insert viewing trips for their referred leads"
ON public.customer_viewing_trips
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.crm_leads cl
    JOIN public.partners p ON p.id = cl.referred_by_partner_id
    WHERE cl.id = crm_lead_id
    AND p.user_id = auth.uid()
    AND p.active = true
  )
);

-- 5. RLS policy voor partners om manual_events aan te maken (voor afspraken)
CREATE POLICY "Partners can insert manual events for their referred leads"
ON public.manual_events
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.crm_leads cl
    JOIN public.partners p ON p.id = cl.referred_by_partner_id
    WHERE cl.id = crm_lead_id
    AND p.user_id = auth.uid()
    AND p.active = true
  )
);

-- 6. RLS policy voor partners om manual_events te lezen
CREATE POLICY "Partners can read manual events for their referred leads"
ON public.manual_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.crm_leads cl
    JOIN public.partners p ON p.id = cl.referred_by_partner_id
    WHERE cl.id = crm_lead_id
    AND p.user_id = auth.uid()
    AND p.active = true
  )
);

-- ==========================================
-- AUTOMATISCHE JOURNEY FASE UPDATES
-- ==========================================

-- 7. Trigger: Bij eerste project toewijzing -> fase naar 'selectie'
CREATE OR REPLACE FUNCTION public.auto_update_journey_phase_on_project_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this is the first project assignment for this lead
  -- and the lead is currently in 'orienteren' phase
  IF (
    SELECT COUNT(*) = 1 
    FROM public.customer_project_selections 
    WHERE crm_lead_id = NEW.crm_lead_id
  ) THEN
    UPDATE public.crm_leads
    SET 
      journey_phase = 'selectie',
      journey_phase_updated_at = NOW()
    WHERE id = NEW.crm_lead_id
    AND (journey_phase = 'orienteren' OR journey_phase IS NULL);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop trigger if exists and create new
DROP TRIGGER IF EXISTS trigger_auto_journey_phase_on_project ON public.customer_project_selections;
CREATE TRIGGER trigger_auto_journey_phase_on_project
  AFTER INSERT ON public.customer_project_selections
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_update_journey_phase_on_project_assignment();

-- 8. Trigger: Bij bezichtigingsreis aanmaken -> fase naar 'bezichtiging'
CREATE OR REPLACE FUNCTION public.auto_update_journey_phase_on_trip_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- Update journey phase to bezichtiging when a viewing trip is created
  UPDATE public.crm_leads
  SET 
    journey_phase = 'bezichtiging',
    journey_phase_updated_at = NOW()
  WHERE id = NEW.crm_lead_id
  AND journey_phase IN ('orienteren', 'selectie');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop trigger if exists and create new
DROP TRIGGER IF EXISTS trigger_auto_journey_phase_on_trip ON public.customer_viewing_trips;
CREATE TRIGGER trigger_auto_journey_phase_on_trip
  AFTER INSERT ON public.customer_viewing_trips
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_update_journey_phase_on_trip_creation();