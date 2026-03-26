-- Trigger to auto-link sales to referring partners when sale_customers is inserted
CREATE OR REPLACE FUNCTION public.auto_link_sale_to_referring_partner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    ON CONFLICT (sale_id, partner_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on sale_customers insert
DROP TRIGGER IF EXISTS trg_auto_link_sale_to_referring_partner ON public.sale_customers;
CREATE TRIGGER trg_auto_link_sale_to_referring_partner
AFTER INSERT ON public.sale_customers
FOR EACH ROW
EXECUTE FUNCTION public.auto_link_sale_to_referring_partner();

-- RLS policies for partners to view financial data of their linked sales

-- Partners can view sale_customers for their linked sales
CREATE POLICY "Partners can view sale_customers for linked sales"
ON public.sale_customers
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.sale_partners sp
    JOIN public.partners p ON p.id = sp.partner_id
    WHERE sp.sale_id = sale_customers.sale_id
    AND p.user_id = auth.uid()
  )
);

-- Partners can view sale_purchase_costs for their linked sales
CREATE POLICY "Partners can view sale_purchase_costs for linked sales"
ON public.sale_purchase_costs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.sale_partners sp
    JOIN public.partners p ON p.id = sp.partner_id
    WHERE sp.sale_id = sale_purchase_costs.sale_id
    AND p.user_id = auth.uid()
  )
);

-- Partners can view sale_customization_requests for their linked sales
CREATE POLICY "Partners can view sale_customization_requests for linked sales"
ON public.sale_customization_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.sale_partners sp
    JOIN public.partners p ON p.id = sp.partner_id
    WHERE sp.sale_id = sale_customization_requests.sale_id
    AND p.user_id = auth.uid()
  )
);