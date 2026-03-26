-- Create journey_milestones table for pre-sales journey tracking
CREATE TABLE public.journey_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crm_lead_id UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  phase TEXT NOT NULL CHECK (phase IN ('orientatie', 'selectie', 'bezichtiging')),
  template_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  order_index INT NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  target_date DATE,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  customer_visible BOOLEAN DEFAULT true,
  admin_only BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(crm_lead_id, template_key)
);

-- Create indexes for performance
CREATE INDEX idx_journey_milestones_crm_lead ON public.journey_milestones(crm_lead_id);
CREATE INDEX idx_journey_milestones_phase ON public.journey_milestones(phase);
CREATE INDEX idx_journey_milestones_template_key ON public.journey_milestones(template_key);

-- Enable RLS
ALTER TABLE public.journey_milestones ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage journey milestones"
ON public.journey_milestones FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage journey milestones"
ON public.journey_milestones FOR ALL
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

CREATE POLICY "Users can view their own visible journey milestones"
ON public.journey_milestones FOR SELECT
USING (
  customer_visible = true 
  AND crm_lead_id IN (
    SELECT id FROM public.crm_leads WHERE user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_journey_milestones_updated_at
BEFORE UPDATE ON public.journey_milestones
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to auto-complete journey milestone
CREATE OR REPLACE FUNCTION public.auto_complete_journey_milestone(
  p_crm_lead_id UUID,
  p_template_key TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.journey_milestones
  SET completed_at = COALESCE(completed_at, NOW()), updated_at = NOW()
  WHERE crm_lead_id = p_crm_lead_id
    AND template_key = p_template_key
    AND completed_at IS NULL;
END;
$$;

-- Trigger: Auto-complete ori_account when crm_lead gets user_id
CREATE OR REPLACE FUNCTION public.trigger_journey_account_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NOT NULL AND (OLD.user_id IS NULL OR OLD IS NULL) THEN
    PERFORM auto_complete_journey_milestone(NEW.id, 'ori_account');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER journey_account_created
AFTER INSERT OR UPDATE ON public.crm_leads
FOR EACH ROW
EXECUTE FUNCTION public.trigger_journey_account_created();

-- Trigger: Auto-complete ori_profiel when profile is 80%+ complete
CREATE OR REPLACE FUNCTION public.trigger_journey_profile_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_crm_lead_id UUID;
  v_prefs JSONB;
  v_filled INT := 0;
  v_total INT := 5;
BEGIN
  -- Get crm_lead_id from customer_profiles
  SELECT cl.id INTO v_crm_lead_id
  FROM public.crm_leads cl
  WHERE cl.user_id = NEW.user_id OR cl.crm_user_id = NEW.crm_user_id;
  
  IF v_crm_lead_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  v_prefs := COALESCE(NEW.explicit_preferences, '{}'::jsonb);
  
  -- Count filled preferences
  IF v_prefs->>'budget_min' IS NOT NULL THEN v_filled := v_filled + 1; END IF;
  IF v_prefs->>'investment_goal' IS NOT NULL THEN v_filled := v_filled + 1; END IF;
  IF v_prefs->>'timeline' IS NOT NULL THEN v_filled := v_filled + 1; END IF;
  IF jsonb_array_length(COALESCE(v_prefs->'preferred_regions', '[]'::jsonb)) > 0 THEN v_filled := v_filled + 1; END IF;
  IF v_prefs->>'persona_type' IS NOT NULL THEN v_filled := v_filled + 1; END IF;
  
  -- If 80%+ complete (4/5), mark as done
  IF v_filled >= 4 THEN
    PERFORM auto_complete_journey_milestone(v_crm_lead_id, 'ori_profiel');
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER journey_profile_complete
AFTER UPDATE ON public.customer_profiles
FOR EACH ROW
EXECUTE FUNCTION public.trigger_journey_profile_complete();

-- Trigger: Auto-complete ori_projecten_bekeken when 3+ projects viewed
CREATE OR REPLACE FUNCTION public.trigger_journey_projects_viewed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_crm_lead_id UUID;
BEGIN
  -- Get crm_lead_id
  SELECT cl.id INTO v_crm_lead_id
  FROM public.crm_leads cl
  WHERE cl.user_id = NEW.user_id OR cl.crm_user_id = NEW.crm_user_id;
  
  IF v_crm_lead_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- If 3+ projects viewed
  IF array_length(NEW.viewed_projects, 1) >= 3 THEN
    PERFORM auto_complete_journey_milestone(v_crm_lead_id, 'ori_projecten_bekeken');
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER journey_projects_viewed
AFTER UPDATE ON public.customer_profiles
FOR EACH ROW
WHEN (OLD.viewed_projects IS DISTINCT FROM NEW.viewed_projects)
EXECUTE FUNCTION public.trigger_journey_projects_viewed();

-- Trigger: Auto-complete ori_favoriet when favorite added
CREATE OR REPLACE FUNCTION public.trigger_journey_favorite_added()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_crm_lead_id UUID;
BEGIN
  -- Get crm_lead_id
  SELECT cl.id INTO v_crm_lead_id
  FROM public.crm_leads cl
  WHERE cl.user_id = NEW.user_id OR cl.crm_user_id = NEW.crm_user_id;
  
  IF v_crm_lead_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- If has favorites
  IF array_length(NEW.favorite_projects, 1) >= 1 THEN
    PERFORM auto_complete_journey_milestone(v_crm_lead_id, 'ori_favoriet');
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER journey_favorite_added
AFTER UPDATE ON public.customer_profiles
FOR EACH ROW
WHEN (OLD.favorite_projects IS DISTINCT FROM NEW.favorite_projects)
EXECUTE FUNCTION public.trigger_journey_favorite_added();

-- Trigger: Auto-complete bez_reis_gepland when viewing trip created
CREATE OR REPLACE FUNCTION public.trigger_journey_trip_planned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM auto_complete_journey_milestone(NEW.crm_lead_id, 'bez_reis_gepland');
  RETURN NEW;
END;
$$;

CREATE TRIGGER journey_trip_planned
AFTER INSERT ON public.customer_viewing_trips
FOR EACH ROW
EXECUTE FUNCTION public.trigger_journey_trip_planned();

-- Function to check and update journey phase based on milestones
CREATE OR REPLACE FUNCTION public.update_journey_phase_from_milestones()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_crm_lead_id UUID;
  v_current_phase TEXT;
  v_ori_total INT;
  v_ori_done INT;
  v_sel_total INT;
  v_sel_done INT;
BEGIN
  v_crm_lead_id := NEW.crm_lead_id;
  
  -- Get current phase
  SELECT journey_phase INTO v_current_phase FROM public.crm_leads WHERE id = v_crm_lead_id;
  
  -- Count milestones per phase
  SELECT 
    COALESCE(SUM(CASE WHEN phase = 'orientatie' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN phase = 'orientatie' AND completed_at IS NOT NULL THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN phase = 'selectie' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN phase = 'selectie' AND completed_at IS NOT NULL THEN 1 ELSE 0 END), 0)
  INTO v_ori_total, v_ori_done, v_sel_total, v_sel_done
  FROM public.journey_milestones
  WHERE crm_lead_id = v_crm_lead_id;
  
  -- Update phase if all milestones of current phase are done
  IF v_current_phase = 'orientatie' AND v_ori_total > 0 AND v_ori_done = v_ori_total THEN
    UPDATE public.crm_leads 
    SET journey_phase = 'selectie', journey_phase_updated_at = NOW()
    WHERE id = v_crm_lead_id;
  ELSIF v_current_phase = 'selectie' AND v_sel_total > 0 AND v_sel_done = v_sel_total THEN
    UPDATE public.crm_leads 
    SET journey_phase = 'bezichtiging', journey_phase_updated_at = NOW()
    WHERE id = v_crm_lead_id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER journey_phase_auto_update
AFTER UPDATE ON public.journey_milestones
FOR EACH ROW
WHEN (OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL)
EXECUTE FUNCTION public.update_journey_phase_from_milestones();