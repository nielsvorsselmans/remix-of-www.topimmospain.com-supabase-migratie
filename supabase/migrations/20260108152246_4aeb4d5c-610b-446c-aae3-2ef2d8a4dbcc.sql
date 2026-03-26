-- Update the handle_new_user trigger to check for existing CRM leads
-- and link them instead of creating duplicates

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  skip_creation BOOLEAN;
  existing_lead_id UUID;
BEGIN
  -- Check if we should skip CRM lead creation (set by verify-otp-code or fix-email-mismatch)
  skip_creation := COALESCE(
    (NEW.raw_user_meta_data->>'skip_crm_lead_creation')::BOOLEAN, 
    FALSE
  );
  
  -- Check if a CRM lead already exists with this email
  SELECT id INTO existing_lead_id
  FROM public.crm_leads
  WHERE LOWER(email) = LOWER(NEW.email)
    AND user_id IS NULL  -- Only unlinked leads
  LIMIT 1;
  
  -- If an existing unlinked CRM lead exists, link it to this new user
  IF existing_lead_id IS NOT NULL THEN
    UPDATE public.crm_leads
    SET user_id = NEW.id,
        updated_at = NOW(),
        merged_at = NOW()
    WHERE id = existing_lead_id;
    
    -- Also create/update customer_profiles to link
    INSERT INTO public.customer_profiles (user_id, crm_lead_id, updated_at)
    VALUES (NEW.id, existing_lead_id, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      crm_lead_id = existing_lead_id,
      updated_at = NOW();
    
    RETURN NEW;
  END IF;
  
  -- If skip_creation is true and no existing lead, just return
  IF skip_creation THEN
    RETURN NEW;
  END IF;
  
  -- Create new CRM lead for genuinely new users
  INSERT INTO public.crm_leads (
    email,
    user_id,
    source_campaign,
    created_at,
    updated_at
  ) VALUES (
    NEW.email,
    NEW.id,
    'Website Direct Signup',
    NOW(),
    NOW()
  );
  
  -- Create customer_profiles entry
  INSERT INTO public.customer_profiles (user_id, created_at, updated_at)
  VALUES (NEW.id, NOW(), NOW())
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;