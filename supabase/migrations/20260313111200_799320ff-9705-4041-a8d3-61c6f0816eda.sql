
-- Update orphan cleanup function to use 7 days instead of 90 days
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_customer_profiles()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM customer_profiles
  WHERE user_id IS NULL 
  AND crm_lead_id IS NULL
  AND crm_user_id IS NULL
  AND created_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Cleaned up % orphaned customer profiles', deleted_count;
  RETURN deleted_count;
END;
$function$;
