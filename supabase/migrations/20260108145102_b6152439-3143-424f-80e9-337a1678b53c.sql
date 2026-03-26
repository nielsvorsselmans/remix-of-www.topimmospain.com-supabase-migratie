-- Create function to validate that CRM lead email matches auth user email
CREATE OR REPLACE FUNCTION public.validate_crm_lead_user_email()
RETURNS TRIGGER AS $$
DECLARE
  auth_email TEXT;
BEGIN
  -- Skip if user_id is not changing or is being cleared
  IF NEW.user_id IS NULL OR NEW.user_id = OLD.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Get auth user email
  SELECT email INTO auth_email 
  FROM auth.users 
  WHERE id = NEW.user_id;
  
  -- If no auth user found, allow the update (edge case)
  IF auth_email IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Validate that emails match (case-insensitive)
  IF LOWER(COALESCE(auth_email, '')) != LOWER(COALESCE(NEW.email, '')) THEN
    RAISE EXCEPTION 'Email mismatch: CRM lead email (%) does not match auth user email (%)', 
      NEW.email, auth_email;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to validate email before updating user_id
CREATE TRIGGER check_crm_lead_user_email
BEFORE UPDATE ON public.crm_leads
FOR EACH ROW
WHEN (NEW.user_id IS DISTINCT FROM OLD.user_id)
EXECUTE FUNCTION public.validate_crm_lead_user_email();