CREATE OR REPLACE FUNCTION public.sync_last_payment_to_notary_date()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.notary_date IS NOT NULL 
     AND NEW.notary_date IS DISTINCT FROM OLD.notary_date THEN
    UPDATE sale_payments
    SET due_date = NEW.notary_date, updated_at = now()
    WHERE sale_id = NEW.id
      AND order_index = (
        SELECT MAX(order_index) FROM sale_payments WHERE sale_id = NEW.id
      );
  END IF;
  RETURN NEW;
END;
$$;