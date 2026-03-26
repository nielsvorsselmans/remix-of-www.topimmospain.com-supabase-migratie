-- First drop the default constraint
ALTER TABLE sales ALTER COLUMN status DROP DEFAULT;

-- Create new enum type with phase-aligned values
CREATE TYPE sale_status_new AS ENUM (
  'reservatie',
  'koopcontract', 
  'voorbereiding',
  'akkoord',
  'overdracht',
  'afgerond',
  'geannuleerd'
);

-- Update the sales table to use new enum, mapping old values
ALTER TABLE sales 
  ALTER COLUMN status TYPE sale_status_new 
  USING CASE status::text
    WHEN 'reservation' THEN 'reservatie'::sale_status_new
    WHEN 'contract_signed' THEN 'koopcontract'::sale_status_new
    WHEN 'financing' THEN 'voorbereiding'::sale_status_new
    WHEN 'notary_scheduled' THEN 'overdracht'::sale_status_new
    WHEN 'completed' THEN 'afgerond'::sale_status_new
    WHEN 'cancelled' THEN 'geannuleerd'::sale_status_new
    ELSE 'reservatie'::sale_status_new
  END;

-- Drop old enum and rename new one
DROP TYPE IF EXISTS sale_status;
ALTER TYPE sale_status_new RENAME TO sale_status;

-- Set new default
ALTER TABLE sales 
  ALTER COLUMN status SET DEFAULT 'reservatie'::sale_status;

-- Create function to calculate sale status based on checklist progress
CREATE OR REPLACE FUNCTION calculate_sale_status(p_sale_id UUID)
RETURNS sale_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_res_total INT;
  v_res_done INT;
  v_koop_total INT;
  v_koop_done INT;
  v_voorb_total INT;
  v_voorb_done INT;
  v_akk_total INT;
  v_akk_done INT;
  v_overd_total INT;
  v_overd_done INT;
  v_status sale_status;
BEGIN
  -- Count items per phase
  SELECT 
    COALESCE(SUM(CASE WHEN phase = 'reservatie' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN phase = 'reservatie' AND completed_at IS NOT NULL THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN phase = 'koopcontract' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN phase = 'koopcontract' AND completed_at IS NOT NULL THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN phase = 'voorbereiding' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN phase = 'voorbereiding' AND completed_at IS NOT NULL THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN phase = 'akkoord' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN phase = 'akkoord' AND completed_at IS NOT NULL THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN phase = 'overdracht' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN phase = 'overdracht' AND completed_at IS NOT NULL THEN 1 ELSE 0 END), 0)
  INTO v_res_total, v_res_done, v_koop_total, v_koop_done, v_voorb_total, v_voorb_done, v_akk_total, v_akk_done, v_overd_total, v_overd_done
  FROM sale_milestones
  WHERE sale_id = p_sale_id;

  -- Determine status based on phase completion (sequential)
  IF v_res_total > 0 AND v_res_done < v_res_total THEN
    v_status := 'reservatie';
  ELSIF v_koop_total > 0 AND v_koop_done < v_koop_total THEN
    v_status := 'koopcontract';
  ELSIF v_voorb_total > 0 AND v_voorb_done < v_voorb_total THEN
    v_status := 'voorbereiding';
  ELSIF v_akk_total > 0 AND v_akk_done < v_akk_total THEN
    v_status := 'akkoord';
  ELSIF v_overd_total > 0 AND v_overd_done < v_overd_total THEN
    v_status := 'overdracht';
  ELSIF v_overd_total > 0 AND v_overd_done = v_overd_total THEN
    v_status := 'afgerond';
  ELSE
    v_status := 'reservatie';
  END IF;

  RETURN v_status;
END;
$$;

-- Create trigger function to auto-update sale status
CREATE OR REPLACE FUNCTION trigger_update_sale_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_status sale_status;
  v_current_status sale_status;
  v_sale_id UUID;
BEGIN
  -- Get the sale_id from the row
  IF TG_OP = 'DELETE' THEN
    v_sale_id := OLD.sale_id;
  ELSE
    v_sale_id := NEW.sale_id;
  END IF;

  -- Get current status
  SELECT status INTO v_current_status FROM sales WHERE id = v_sale_id;
  
  -- Skip if cancelled (manual override)
  IF v_current_status = 'geannuleerd' THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  -- Calculate new status
  v_new_status := calculate_sale_status(v_sale_id);

  -- Update if different
  IF v_new_status IS DISTINCT FROM v_current_status THEN
    UPDATE sales SET status = v_new_status, updated_at = now() WHERE id = v_sale_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on sale_milestones
DROP TRIGGER IF EXISTS update_sale_status_on_milestone_change ON sale_milestones;
CREATE TRIGGER update_sale_status_on_milestone_change
  AFTER INSERT OR UPDATE OR DELETE ON sale_milestones
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_sale_status();

-- Update all existing sales to have correct status based on their checklists
UPDATE sales SET status = calculate_sale_status(id) WHERE status != 'geannuleerd';