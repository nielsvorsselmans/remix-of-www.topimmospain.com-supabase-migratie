
-- Add 'nazorg' to sale_status enum
ALTER TYPE sale_status ADD VALUE IF NOT EXISTS 'nazorg' BEFORE 'afgerond';

-- Update calculate_sale_status to include nazorg phase
CREATE OR REPLACE FUNCTION public.calculate_sale_status(p_sale_id uuid)
 RETURNS sale_status
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  v_nazorg_total INT;
  v_nazorg_done INT;
  v_status sale_status;
BEGIN
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
    COALESCE(SUM(CASE WHEN phase = 'overdracht' AND completed_at IS NOT NULL THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN phase = 'nazorg' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN phase = 'nazorg' AND completed_at IS NOT NULL THEN 1 ELSE 0 END), 0)
  INTO v_res_total, v_res_done, v_koop_total, v_koop_done, v_voorb_total, v_voorb_done, v_akk_total, v_akk_done, v_overd_total, v_overd_done, v_nazorg_total, v_nazorg_done
  FROM sale_milestones
  WHERE sale_id = p_sale_id;

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
  ELSIF v_nazorg_total > 0 AND v_nazorg_done < v_nazorg_total THEN
    v_status := 'nazorg';
  ELSIF v_nazorg_total > 0 AND v_nazorg_done = v_nazorg_total THEN
    v_status := 'afgerond';
  ELSIF v_overd_total > 0 AND v_overd_done = v_overd_total THEN
    v_status := 'afgerond';
  ELSE
    v_status := 'reservatie';
  END IF;

  RETURN v_status;
END;
$function$;
