-- Add new columns to crm_leads for qualification tracking
ALTER TABLE public.crm_leads 
ADD COLUMN IF NOT EXISTS qualified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS qualification_reason TEXT;

-- Create function to calculate lead qualification based on engagement data
CREATE OR REPLACE FUNCTION public.calculate_lead_qualification(p_engagement_data JSONB)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_total_visits INT;
  v_total_time INT;
  v_total_project_views INT;
  v_engagement_depth TEXT;
BEGIN
  -- Extract engagement metrics
  v_total_visits := COALESCE((p_engagement_data->>'total_visits')::INT, 0);
  v_total_time := COALESCE((p_engagement_data->>'total_time_on_site_seconds')::INT, 0);
  v_total_project_views := COALESCE((p_engagement_data->>'total_project_views')::INT, 0);
  v_engagement_depth := COALESCE(p_engagement_data->>'engagement_depth', 'low');
  
  -- Active: High engagement (multiple visits, significant time, project interest)
  IF v_total_visits >= 2 OR v_total_time >= 300 OR v_total_project_views >= 3 OR v_engagement_depth IN ('high', 'very_high') THEN
    RETURN 'active';
  END IF;
  
  -- Waiting: Some engagement (single visit with interest)
  IF v_total_visits = 1 AND (v_total_time >= 60 OR v_total_project_views >= 1) THEN
    RETURN 'waiting';
  END IF;
  
  -- Passive: Minimal or no engagement
  RETURN 'passive';
END;
$$;

-- Create trigger function to auto-qualify leads when engagement changes
CREATE OR REPLACE FUNCTION public.trigger_auto_qualify_lead()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_new_status TEXT;
  v_current_status TEXT;
  v_crm_lead_id UUID;
BEGIN
  -- Find the crm_lead for this customer_profile
  SELECT cl.id, cl.follow_up_status INTO v_crm_lead_id, v_current_status
  FROM public.crm_leads cl
  WHERE cl.user_id = NEW.user_id 
     OR cl.visitor_id = NEW.visitor_id 
     OR cl.crm_user_id = NEW.crm_user_id;
  
  IF v_crm_lead_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Don't auto-update if manually set to not_interested or archived
  IF v_current_status IN ('not_interested', 'archived') THEN
    RETURN NEW;
  END IF;
  
  -- Calculate new qualification status
  v_new_status := calculate_lead_qualification(NEW.engagement_data);
  
  -- Only upgrade status, never downgrade (active > waiting > passive > new)
  IF v_current_status IS NULL OR v_current_status = 'new' THEN
    -- Always update from new
    UPDATE public.crm_leads
    SET follow_up_status = v_new_status,
        qualified_at = CASE WHEN v_new_status IN ('active', 'waiting') THEN NOW() ELSE qualified_at END,
        qualification_reason = CASE 
          WHEN v_new_status = 'active' THEN 'Hoge engagement: ' || COALESCE(NEW.engagement_data->>'total_visits', '0') || ' bezoeken, ' || COALESCE(NEW.engagement_data->>'total_project_views', '0') || ' projecten bekeken'
          WHEN v_new_status = 'waiting' THEN 'Eerste interesse: ' || COALESCE(NEW.engagement_data->>'total_time_on_site_seconds', '0') || 's op site'
          ELSE 'Minimale engagement'
        END,
        updated_at = NOW()
    WHERE id = v_crm_lead_id;
  ELSIF v_current_status = 'passive' AND v_new_status IN ('active', 'waiting') THEN
    -- Upgrade from passive
    UPDATE public.crm_leads
    SET follow_up_status = v_new_status,
        qualified_at = NOW(),
        qualification_reason = 'Upgrade: engagement toegenomen',
        updated_at = NOW()
    WHERE id = v_crm_lead_id;
  ELSIF v_current_status = 'waiting' AND v_new_status = 'active' THEN
    -- Upgrade from waiting to active
    UPDATE public.crm_leads
    SET follow_up_status = 'active',
        qualified_at = NOW(),
        qualification_reason = 'Upgrade naar actief: hoge engagement',
        updated_at = NOW()
    WHERE id = v_crm_lead_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger on customer_profiles
DROP TRIGGER IF EXISTS trigger_auto_qualify_on_engagement ON public.customer_profiles;
CREATE TRIGGER trigger_auto_qualify_on_engagement
AFTER INSERT OR UPDATE OF engagement_data ON public.customer_profiles
FOR EACH ROW
EXECUTE FUNCTION public.trigger_auto_qualify_lead();

-- Backfill existing leads based on their engagement data
WITH lead_qualifications AS (
  SELECT 
    cl.id as lead_id,
    cl.follow_up_status as current_status,
    cp.engagement_data,
    calculate_lead_qualification(cp.engagement_data) as new_status,
    COALESCE((cp.engagement_data->>'total_visits')::INT, 0) as visits,
    COALESCE((cp.engagement_data->>'total_project_views')::INT, 0) as project_views,
    COALESCE((cp.engagement_data->>'total_time_on_site_seconds')::INT, 0) as time_on_site
  FROM public.crm_leads cl
  LEFT JOIN public.customer_profiles cp ON 
    cp.user_id = cl.user_id OR 
    cp.visitor_id = cl.visitor_id OR 
    cp.crm_user_id = cl.crm_user_id
  WHERE cl.follow_up_status IS NULL OR cl.follow_up_status = 'new'
)
UPDATE public.crm_leads cl
SET 
  follow_up_status = lq.new_status,
  qualified_at = CASE WHEN lq.new_status IN ('active', 'waiting') THEN NOW() ELSE NULL END,
  qualification_reason = CASE 
    WHEN lq.new_status = 'active' THEN 'Backfill: ' || lq.visits || ' bezoeken, ' || lq.project_views || ' projecten'
    WHEN lq.new_status = 'waiting' THEN 'Backfill: eerste interesse (' || lq.time_on_site || 's)'
    ELSE 'Backfill: minimale engagement'
  END,
  updated_at = NOW()
FROM lead_qualifications lq
WHERE cl.id = lq.lead_id;