-- Functie die journey_phase update wanneer sale_customer wordt aangemaakt
CREATE OR REPLACE FUNCTION public.update_journey_phase_on_sale_customer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update journey_phase naar 'aankoop' als huidige fase eerder is
  UPDATE public.crm_leads 
  SET 
    journey_phase = 'aankoop',
    journey_phase_updated_at = now()
  WHERE id = NEW.crm_lead_id
  AND journey_phase IN ('orientatie', 'selectie', 'bezichtiging');
  
  RETURN NEW;
END;
$$;

-- Trigger die de functie aanroept bij nieuwe sale_customer
CREATE TRIGGER on_sale_customer_insert_update_phase
AFTER INSERT ON public.sale_customers
FOR EACH ROW
EXECUTE FUNCTION public.update_journey_phase_on_sale_customer();

-- One-time fix voor bestaande klanten met sales die nog niet op aankoop staan
UPDATE crm_leads 
SET journey_phase = 'aankoop',
    journey_phase_updated_at = now()
WHERE id IN (
  SELECT DISTINCT crm_lead_id 
  FROM sale_customers
)
AND journey_phase IN ('orientatie', 'selectie', 'bezichtiging');