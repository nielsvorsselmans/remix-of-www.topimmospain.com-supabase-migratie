
-- Functie: auto-complete notary milestone bij notary_date wijziging
CREATE OR REPLACE FUNCTION public.auto_complete_notary_milestone()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.notary_date IS NOT NULL AND NEW.notary_date IS DISTINCT FROM OLD.notary_date THEN
    UPDATE sale_milestones
    SET completed_at = COALESCE(completed_at, NOW()), updated_at = NOW()
    WHERE sale_id = NEW.id AND template_key = 'overd_notaris_datum' AND completed_at IS NULL;
  ELSIF NEW.notary_date IS NULL AND OLD.notary_date IS NOT NULL THEN
    UPDATE sale_milestones
    SET completed_at = NULL, updated_at = NOW()
    WHERE sale_id = NEW.id AND template_key = 'overd_notaris_datum';
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger op sales tabel
CREATE TRIGGER trg_auto_complete_notary_milestone
AFTER UPDATE OF notary_date ON public.sales
FOR EACH ROW EXECUTE FUNCTION auto_complete_notary_milestone();

-- Backfill: bestaande verkopen met notary_date maar zonder completed milestone
UPDATE sale_milestones
SET completed_at = NOW(), updated_at = NOW()
WHERE template_key = 'overd_notaris_datum'
  AND completed_at IS NULL
  AND sale_id IN (SELECT id FROM sales WHERE notary_date IS NOT NULL);
