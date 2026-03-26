-- Fix the ON CONFLICT clause to match the existing unique constraint
CREATE OR REPLACE FUNCTION public.auto_link_sale_to_referring_partner()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_partner_id UUID;
BEGIN
  -- Get the referring partner from the crm_lead
  SELECT referred_by_partner_id INTO v_partner_id
  FROM public.crm_leads
  WHERE id = NEW.crm_lead_id;
  
  -- If there's a referring partner, link them to the sale
  IF v_partner_id IS NOT NULL THEN
    INSERT INTO public.sale_partners (sale_id, partner_id, role, access_level, commission_percentage, commission_amount)
    VALUES (NEW.sale_id, v_partner_id, 'referring_partner', 'view', 0, 0)
    ON CONFLICT (sale_id, partner_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;