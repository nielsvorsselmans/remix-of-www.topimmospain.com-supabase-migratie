
-- 1. Create status history table
CREATE TABLE public.external_assignment_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.external_listing_assignments(id) ON DELETE CASCADE,
  old_status text,
  new_status text NOT NULL,
  changed_by uuid REFERENCES auth.users(id),
  changed_at timestamptz NOT NULL DEFAULT now(),
  notes text
);

-- 2. Enable RLS
ALTER TABLE public.external_assignment_status_history ENABLE ROW LEVEL SECURITY;

-- 3. RLS: admins can read all
CREATE POLICY "Admins can read all status history"
ON public.external_assignment_status_history
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 4. RLS: customers can read their own assignment history
CREATE POLICY "Customers can read own assignment history"
ON public.external_assignment_status_history
FOR SELECT
TO authenticated
USING (
  assignment_id IN (
    SELECT ela.id FROM public.external_listing_assignments ela
    JOIN public.crm_leads cl ON cl.id = ela.crm_lead_id
    WHERE cl.user_id = auth.uid()
  )
);

-- 5. Trigger function to log status changes
CREATE OR REPLACE FUNCTION public.log_external_assignment_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.external_assignment_status_history (
      assignment_id, old_status, new_status, changed_by
    ) VALUES (
      NEW.id, OLD.status, NEW.status, auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

-- 6. Attach trigger
CREATE TRIGGER trg_log_external_assignment_status
AFTER UPDATE ON public.external_listing_assignments
FOR EACH ROW
EXECUTE FUNCTION public.log_external_assignment_status_change();

-- 7. Index for fast lookups
CREATE INDEX idx_ext_assignment_history_assignment_id 
ON public.external_assignment_status_history(assignment_id);
