
-- Create the activity log table
CREATE TABLE public.sale_milestone_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id uuid NOT NULL REFERENCES public.sale_milestones(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  old_value text,
  new_value text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups by milestone
CREATE INDEX idx_milestone_activity_log_milestone_id ON public.sale_milestone_activity_log(milestone_id);
CREATE INDEX idx_milestone_activity_log_created_at ON public.sale_milestone_activity_log(created_at DESC);

-- Enable RLS
ALTER TABLE public.sale_milestone_activity_log ENABLE ROW LEVEL SECURITY;

-- Admin-only policies using existing has_role function
CREATE POLICY "Admins can read activity logs"
ON public.sale_milestone_activity_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert activity logs"
ON public.sale_milestone_activity_log
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger function to auto-log changes on sale_milestones
CREATE OR REPLACE FUNCTION public.log_milestone_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid;
  v_action text;
BEGIN
  v_actor := auth.uid();

  -- completed_at changed
  IF OLD.completed_at IS DISTINCT FROM NEW.completed_at THEN
    IF NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL THEN
      -- Determine if auto or manual
      v_action := CASE WHEN v_actor IS NULL THEN 'auto_completed' ELSE 'completed' END;
    ELSIF NEW.completed_at IS NULL AND OLD.completed_at IS NOT NULL THEN
      v_action := 'uncompleted';
    END IF;
    
    INSERT INTO sale_milestone_activity_log (milestone_id, actor_id, action_type, old_value, new_value)
    VALUES (NEW.id, v_actor, v_action, OLD.completed_at::text, NEW.completed_at::text);
  END IF;

  -- target_date changed
  IF OLD.target_date IS DISTINCT FROM NEW.target_date THEN
    INSERT INTO sale_milestone_activity_log (milestone_id, actor_id, action_type, old_value, new_value)
    VALUES (NEW.id, v_actor, 'deadline_changed', OLD.target_date::text, NEW.target_date::text);
  END IF;

  -- priority changed
  IF OLD.priority IS DISTINCT FROM NEW.priority THEN
    INSERT INTO sale_milestone_activity_log (milestone_id, actor_id, action_type, old_value, new_value)
    VALUES (NEW.id, v_actor, 'priority_changed', OLD.priority, NEW.priority);
  END IF;

  -- customer_visible changed
  IF OLD.customer_visible IS DISTINCT FROM NEW.customer_visible THEN
    INSERT INTO sale_milestone_activity_log (milestone_id, actor_id, action_type, old_value, new_value)
    VALUES (NEW.id, v_actor, 'visibility_changed', OLD.customer_visible::text, NEW.customer_visible::text);
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger
CREATE TRIGGER trg_log_milestone_changes
AFTER UPDATE ON public.sale_milestones
FOR EACH ROW
EXECUTE FUNCTION public.log_milestone_changes();

-- Also log when milestones are created
CREATE OR REPLACE FUNCTION public.log_milestone_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO sale_milestone_activity_log (milestone_id, actor_id, action_type)
  VALUES (NEW.id, auth.uid(), 'created');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_milestone_created
AFTER INSERT ON public.sale_milestones
FOR EACH ROW
EXECUTE FUNCTION public.log_milestone_created();
