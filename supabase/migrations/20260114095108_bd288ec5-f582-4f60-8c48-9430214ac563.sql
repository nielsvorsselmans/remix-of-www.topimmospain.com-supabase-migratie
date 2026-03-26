-- Update the create_crm_lead_for_new_user function to check for existing leads by email
CREATE OR REPLACE FUNCTION public.create_crm_lead_for_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_crm_user_id TEXT;
  v_existing_lead_id UUID;
BEGIN
  -- First check if there's an existing CRM lead with the same email but no user_id
  SELECT id INTO v_existing_lead_id
  FROM public.crm_leads
  WHERE email ILIKE NEW.email
    AND user_id IS NULL
  LIMIT 1;
  
  IF v_existing_lead_id IS NOT NULL THEN
    -- Link existing CRM lead to this user
    UPDATE public.crm_leads
    SET user_id = NEW.id,
        first_name = COALESCE(first_name, NEW.first_name),
        last_name = COALESCE(last_name, NEW.last_name),
        updated_at = NOW()
    WHERE id = v_existing_lead_id;
    
    -- Also update the existing customer_profile
    UPDATE public.customer_profiles
    SET user_id = NEW.id,
        updated_at = NOW()
    WHERE crm_lead_id = v_existing_lead_id
      AND user_id IS NULL;
      
    RETURN NEW;
  END IF;
  
  -- Check if a crm_lead already exists for this user (by user_id)
  IF NOT EXISTS (SELECT 1 FROM public.crm_leads WHERE user_id = NEW.id) THEN
    -- Generate a unique crm_user_id
    v_crm_user_id := 'usr_' || replace(gen_random_uuid()::text, '-', '');
    
    INSERT INTO public.crm_leads (
      crm_user_id,
      user_id,
      first_name,
      last_name,
      email,
      journey_phase,
      follow_up_status,
      created_at
    ) VALUES (
      v_crm_user_id,
      NEW.id,
      NEW.first_name,
      NEW.last_name,
      NEW.email,
      'orientatie',
      'new',
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$function$;