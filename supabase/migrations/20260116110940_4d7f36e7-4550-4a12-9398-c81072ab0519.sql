-- Fix type mismatch in sync_ghl_note_to_conversation trigger
-- The source_id column is uuid, but we were casting to text

CREATE OR REPLACE FUNCTION public.sync_ghl_note_to_conversation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.conversations (
    crm_lead_id,
    source_type,
    source_id,
    raw_notes,
    processed
  )
  VALUES (
    NEW.crm_lead_id,
    'ghl_note',
    NEW.id,  -- Remove ::text cast, NEW.id is already uuid
    NEW.body,
    false
  )
  ON CONFLICT (source_type, source_id) DO UPDATE SET
    raw_notes = EXCLUDED.raw_notes;
  
  RETURN NEW;
END;
$function$;