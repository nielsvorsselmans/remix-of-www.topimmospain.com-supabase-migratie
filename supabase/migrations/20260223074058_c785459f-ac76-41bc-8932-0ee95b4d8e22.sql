
CREATE OR REPLACE FUNCTION public.sync_ghl_appointment_to_conversation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.is_summary_published = true AND NEW.local_notes IS NOT NULL THEN
    INSERT INTO public.conversations (
      crm_lead_id,
      source_type,
      source_id,
      raw_notes,
      processed
    )
    VALUES (
      NEW.crm_lead_id,
      'ghl_appointment',
      NEW.id,
      NEW.local_notes,
      false
    )
    ON CONFLICT (source_type, source_id) DO UPDATE SET
      raw_notes = EXCLUDED.raw_notes;
  END IF;
  
  RETURN NEW;
END;
$function$;
