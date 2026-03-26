-- Create function for reverse sync: when partner is added to sale, link to customer
CREATE OR REPLACE FUNCTION public.sync_customer_to_sale_partner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only process for referring_partner role
  IF NEW.role = 'referring_partner' THEN
    -- Update all customers in this sale that don't have a partner yet
    UPDATE public.crm_leads cl
    SET referred_by_partner_id = NEW.partner_id,
        updated_at = now()
    FROM public.sale_customers sc
    WHERE sc.crm_lead_id = cl.id
      AND sc.sale_id = NEW.sale_id
      AND cl.referred_by_partner_id IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on sale_partners INSERT
CREATE TRIGGER trg_sync_customer_to_sale_partner
AFTER INSERT ON public.sale_partners
FOR EACH ROW
EXECUTE FUNCTION public.sync_customer_to_sale_partner();

-- One-time fix: link existing customers to their sale partners
UPDATE public.crm_leads cl
SET referred_by_partner_id = sp.partner_id,
    updated_at = now()
FROM public.sale_customers sc
JOIN public.sale_partners sp ON sp.sale_id = sc.sale_id
WHERE sc.crm_lead_id = cl.id
  AND sp.role = 'referring_partner'
  AND cl.referred_by_partner_id IS NULL;