-- Create table for pending GHL sync queue
CREATE TABLE public.pending_ghl_syncs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  crm_lead_id UUID REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT,
  ghl_contact_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  UNIQUE(user_id)
);

-- Index for efficient queue processing
CREATE INDEX idx_pending_ghl_syncs_status ON public.pending_ghl_syncs(status, attempts) WHERE status = 'pending';
CREATE INDEX idx_pending_ghl_syncs_created ON public.pending_ghl_syncs(created_at) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE public.pending_ghl_syncs ENABLE ROW LEVEL SECURITY;

-- Admin only access
CREATE POLICY "Admin access to pending_ghl_syncs" ON public.pending_ghl_syncs
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Update create_crm_lead_for_new_user trigger to queue GHL sync
CREATE OR REPLACE FUNCTION public.create_crm_lead_for_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_crm_user_id TEXT;
  v_existing_lead_id UUID;
  v_new_lead_id UUID;
  v_skip_ghl_sync BOOLEAN;
BEGIN
  -- Check metadata flag for skipping GHL sync (for bulk imports etc.)
  v_skip_ghl_sync := COALESCE((NEW.raw_user_meta_data->>'skip_ghl_sync')::boolean, false);
  
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
        merged_at = NOW(),
        updated_at = NOW()
    WHERE id = v_existing_lead_id;
    
    -- Also update the existing customer_profile
    UPDATE public.customer_profiles
    SET user_id = NEW.id,
        updated_at = NOW()
    WHERE crm_lead_id = v_existing_lead_id
      AND user_id IS NULL;
    
    -- Queue GHL sync if not skipped
    IF NOT v_skip_ghl_sync THEN
      INSERT INTO public.pending_ghl_syncs (user_id, crm_lead_id, email, first_name, last_name)
      VALUES (NEW.id, v_existing_lead_id, NEW.email, NEW.first_name, NEW.last_name)
      ON CONFLICT (user_id) DO NOTHING;
    END IF;
      
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
      merged_at,
      created_at
    ) VALUES (
      v_crm_user_id,
      NEW.id,
      NEW.first_name,
      NEW.last_name,
      NEW.email,
      'orientatie',
      'new',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_new_lead_id;
    
    -- Queue GHL sync if not skipped
    IF NOT v_skip_ghl_sync AND v_new_lead_id IS NOT NULL THEN
      INSERT INTO public.pending_ghl_syncs (user_id, crm_lead_id, email, first_name, last_name)
      VALUES (NEW.id, v_new_lead_id, NEW.email, NEW.first_name, NEW.last_name)
      ON CONFLICT (user_id) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;