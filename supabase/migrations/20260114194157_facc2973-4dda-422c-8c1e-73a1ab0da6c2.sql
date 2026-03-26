-- Drop the redundant create_crm_lead_for_new_user function
DROP FUNCTION IF EXISTS public.create_crm_lead_for_new_user() CASCADE;

-- Update handle_new_user to include profile creation + GHL queue
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_skip_ghl_sync BOOLEAN;
  v_existing_lead_id UUID;
  v_new_lead_id UUID;
  v_first_name TEXT;
  v_last_name TEXT;
  v_phone TEXT;
  v_source TEXT;
BEGIN
  -- Extract metadata with defaults
  v_first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', '');
  v_last_name := COALESCE(NEW.raw_user_meta_data->>'last_name', '');
  v_phone := NEW.raw_user_meta_data->>'phone';
  v_source := COALESCE(NEW.raw_user_meta_data->>'source', 'website');
  v_skip_ghl_sync := COALESCE((NEW.raw_user_meta_data->>'skip_ghl_sync')::boolean, false);
  
  -- 1. Create or update profile record (with empty string defaults for NOT NULL columns)
  INSERT INTO public.profiles (id, email, first_name, last_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    v_first_name,
    v_last_name,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = CASE WHEN EXCLUDED.first_name != '' THEN EXCLUDED.first_name ELSE profiles.first_name END,
    last_name = CASE WHEN EXCLUDED.last_name != '' THEN EXCLUDED.last_name ELSE profiles.last_name END,
    updated_at = NOW();
  
  -- 2. Check for existing unlinked CRM lead by email
  SELECT id INTO v_existing_lead_id
  FROM public.crm_leads
  WHERE email ILIKE NEW.email AND user_id IS NULL
  LIMIT 1;
  
  IF v_existing_lead_id IS NOT NULL THEN
    -- Link existing CRM lead to this user
    UPDATE public.crm_leads
    SET 
      user_id = NEW.id,
      first_name = COALESCE(first_name, NULLIF(v_first_name, '')),
      last_name = COALESCE(last_name, NULLIF(v_last_name, '')),
      phone = COALESCE(phone, v_phone),
      updated_at = NOW()
    WHERE id = v_existing_lead_id;
    
    -- Also update customer_profiles if exists
    UPDATE public.customer_profiles
    SET 
      user_id = NEW.id,
      updated_at = NOW()
    WHERE crm_lead_id = v_existing_lead_id AND user_id IS NULL;
    
    v_new_lead_id := v_existing_lead_id;
  ELSE
    -- Create new CRM lead
    INSERT INTO public.crm_leads (
      user_id, 
      email, 
      first_name, 
      last_name, 
      phone,
      journey_phase, 
      follow_up_status,
      source_campaign
    )
    VALUES (
      NEW.id, 
      NEW.email, 
      NULLIF(v_first_name, ''), 
      NULLIF(v_last_name, ''), 
      v_phone,
      'orientatie', 
      'new',
      v_source
    )
    RETURNING id INTO v_new_lead_id;
  END IF;
  
  -- 3. Queue GHL sync if not skipped
  IF NOT v_skip_ghl_sync AND v_new_lead_id IS NOT NULL THEN
    INSERT INTO public.pending_ghl_syncs (
      user_id, 
      crm_lead_id, 
      email, 
      first_name, 
      last_name, 
      status, 
      attempts, 
      created_at
    )
    VALUES (
      NEW.id, 
      v_new_lead_id, 
      NEW.email, 
      NULLIF(v_first_name, ''), 
      NULLIF(v_last_name, ''), 
      'pending', 
      0, 
      NOW()
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;