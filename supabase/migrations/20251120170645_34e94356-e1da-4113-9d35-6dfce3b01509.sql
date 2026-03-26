-- Fix hardcoded JWT token in trigger_auto_link_property function
-- Replace old project credentials with current project environment variables

CREATE OR REPLACE FUNCTION public.trigger_auto_link_property()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  project_url text;
  anon_key text;
BEGIN
  -- Only trigger if property has coordinates but no project_id
  IF (NEW.project_id IS NULL AND NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL) THEN
    -- Get current project URL and anon key from environment
    project_url := current_setting('app.settings.supabase_url', true);
    anon_key := current_setting('app.settings.supabase_anon_key', true);
    
    -- Fallback to hardcoded current project if settings not available
    IF project_url IS NULL THEN
      project_url := 'https://owbzpreqoxedpmlsgdkb.supabase.co';
    END IF;
    
    IF anon_key IS NULL THEN
      anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93YnpwcmVxb3hlZHBtbHNnZGtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0OTQ1ODksImV4cCI6MjA3OTA3MDU4OX0.inBP-WoLqpUjpa9a8ln9MG6WF1wiPHN73wofPUnP2kA';
    END IF;
    
    -- Call edge function asynchronously using pg_net
    PERFORM extensions.http_post(
      url := project_url || '/functions/v1/auto-link-property-single',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || anon_key
      ),
      body := jsonb_build_object('propertyId', NEW.id)
    );
    
    -- Log the trigger
    RAISE NOTICE 'Auto-link trigger fired for property %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$function$;