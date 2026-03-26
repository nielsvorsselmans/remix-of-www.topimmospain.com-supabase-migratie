-- Create trigger function to auto-link sale customers to their partner
CREATE OR REPLACE FUNCTION public.auto_link_sale_customer_to_partner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_partner_id uuid;
BEGIN
  -- Get the partner_id from the first partner on this sale
  SELECT sp.partner_id INTO v_partner_id
  FROM public.sale_partners sp
  WHERE sp.sale_id = NEW.sale_id
  ORDER BY sp.created_at ASC
  LIMIT 1;
  
  -- If there's a partner and the lead isn't already linked to a partner
  IF v_partner_id IS NOT NULL THEN
    -- Update crm_leads
    UPDATE public.crm_leads 
    SET referred_by_partner_id = v_partner_id,
        updated_at = NOW()
    WHERE id = NEW.crm_lead_id 
    AND referred_by_partner_id IS NULL;
    
    -- Update customer_profiles via crm_user_id
    UPDATE public.customer_profiles
    SET referred_by_partner_id = v_partner_id,
        first_touch_partner_at = COALESCE(first_touch_partner_at, NOW()),
        updated_at = NOW()
    WHERE crm_user_id = (SELECT crm_user_id FROM public.crm_leads WHERE id = NEW.crm_lead_id)
    AND referred_by_partner_id IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS trg_auto_link_sale_customer_to_partner ON public.sale_customers;
CREATE TRIGGER trg_auto_link_sale_customer_to_partner
AFTER INSERT ON public.sale_customers
FOR EACH ROW
EXECUTE FUNCTION public.auto_link_sale_customer_to_partner();

-- Migrate existing data: link all existing sale customers to their partners
UPDATE public.crm_leads cl
SET referred_by_partner_id = (
  SELECT sp.partner_id 
  FROM public.sale_partners sp
  JOIN public.sale_customers sc ON sc.sale_id = sp.sale_id
  WHERE sc.crm_lead_id = cl.id
  ORDER BY sp.created_at ASC
  LIMIT 1
),
updated_at = NOW()
WHERE referred_by_partner_id IS NULL
AND EXISTS (
  SELECT 1 FROM public.sale_customers sc
  JOIN public.sale_partners sp ON sp.sale_id = sc.sale_id
  WHERE sc.crm_lead_id = cl.id
);

-- Also update customer_profiles for existing data
UPDATE public.customer_profiles cp
SET referred_by_partner_id = cl.referred_by_partner_id,
    first_touch_partner_at = COALESCE(cp.first_touch_partner_at, NOW()),
    updated_at = NOW()
FROM public.crm_leads cl
WHERE cp.crm_user_id = cl.crm_user_id
AND cl.referred_by_partner_id IS NOT NULL
AND cp.referred_by_partner_id IS NULL;