-- Stap 1: Voeg reactivated_at kolom toe aan crm_leads
ALTER TABLE public.crm_leads 
ADD COLUMN IF NOT EXISTS reactivated_at timestamp with time zone;

-- Stap 2: Update de trigger functie om archived leads te reactiveren bij zeer hoge engagement
CREATE OR REPLACE FUNCTION public.trigger_auto_qualify_lead()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_new_status TEXT;
  v_current_status TEXT;
  v_crm_lead_id UUID;
  v_is_very_high_engagement BOOLEAN;
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
  
  -- Check for very high engagement (re-activation threshold)
  v_is_very_high_engagement := (
    COALESCE((NEW.engagement_data->>'total_visits')::INT, 0) >= 5 OR
    COALESCE((NEW.engagement_data->>'total_project_views')::INT, 0) >= 10 OR
    COALESCE((NEW.engagement_data->>'total_time_on_site_seconds')::INT, 0) >= 600
  );
  
  -- Don't auto-update if manually set to not_interested (permanent)
  IF v_current_status = 'not_interested' THEN
    RETURN NEW;
  END IF;
  
  -- Re-activate archived leads only at very high engagement
  IF v_current_status = 'archived' THEN
    IF v_is_very_high_engagement THEN
      UPDATE public.crm_leads
      SET follow_up_status = 'active',
          qualified_at = NOW(),
          reactivated_at = NOW(),
          qualification_reason = 'Gereactiveerd: zeer hoge engagement na archivering - ' || 
            COALESCE(NEW.engagement_data->>'total_visits', '0') || ' bezoeken, ' || 
            COALESCE(NEW.engagement_data->>'total_project_views', '0') || ' projecten bekeken',
          updated_at = NOW()
      WHERE id = v_crm_lead_id;
    END IF;
    RETURN NEW;
  END IF;
  
  -- Calculate new qualification status for non-archived/non-not_interested leads
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
$function$;