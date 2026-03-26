-- Function to create a crm_lead when a new user profile is created
CREATE OR REPLACE FUNCTION public.create_crm_lead_for_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_crm_user_id TEXT;
BEGIN
  -- Generate a unique crm_user_id
  v_crm_user_id := 'usr_' || replace(gen_random_uuid()::text, '-', '');
  
  -- Check if a crm_lead already exists for this user
  IF NOT EXISTS (SELECT 1 FROM public.crm_leads WHERE user_id = NEW.id) THEN
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
$$;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS on_profile_created_create_crm_lead ON public.profiles;

CREATE TRIGGER on_profile_created_create_crm_lead
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_crm_lead_for_new_user();

-- Sync existing accounts that don't have crm_leads records
INSERT INTO public.crm_leads (crm_user_id, user_id, first_name, last_name, email, journey_phase, follow_up_status, created_at)
SELECT 
  'usr_' || replace(gen_random_uuid()::text, '-', ''),
  p.id,
  p.first_name,
  p.last_name,
  p.email,
  'orientatie',
  'new',
  p.created_at
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.crm_leads cl WHERE cl.user_id = p.id
);