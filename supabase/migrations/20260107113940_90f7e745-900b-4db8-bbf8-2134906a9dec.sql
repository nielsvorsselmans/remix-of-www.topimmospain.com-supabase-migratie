-- Fase 1: Vereenvoudigd Data Model
-- user_id en ghl_contact_id moeten samen aanwezig zijn

-- Stap 1.1: Voeg crm_lead_id toe aan customer_profiles voor directe koppeling
ALTER TABLE customer_profiles
ADD COLUMN IF NOT EXISTS crm_lead_id UUID REFERENCES crm_leads(id) ON DELETE SET NULL;

-- Index voor snelle lookups
CREATE INDEX IF NOT EXISTS idx_customer_profiles_crm_lead_id 
ON customer_profiles(crm_lead_id);

-- Stap 1.2: Trigger voor automatisch linken van visitor_ids
CREATE OR REPLACE FUNCTION link_visitor_to_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Als er een nieuwe visitor_id wordt toegevoegd, voeg toe aan linked_visitor_ids
  IF NEW.visitor_id IS NOT NULL THEN
    -- Check of visitor_id al in de array zit
    IF OLD.linked_visitor_ids IS NULL OR NOT NEW.visitor_id = ANY(COALESCE(OLD.linked_visitor_ids, ARRAY[]::text[])) THEN
      NEW.linked_visitor_ids := array_append(
        COALESCE(NEW.linked_visitor_ids, ARRAY[]::text[]), 
        NEW.visitor_id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS auto_link_visitor ON crm_leads;
CREATE TRIGGER auto_link_visitor
BEFORE INSERT OR UPDATE ON crm_leads
FOR EACH ROW EXECUTE FUNCTION link_visitor_to_user();

-- Stap 1.3: Migreer bestaande customer_profiles naar crm_leads via directe koppeling
UPDATE customer_profiles cp
SET crm_lead_id = (
  SELECT cl.id FROM crm_leads cl
  WHERE 
    (cl.user_id IS NOT NULL AND cl.user_id = cp.user_id) OR
    (cl.crm_user_id IS NOT NULL AND cl.crm_user_id = cp.crm_user_id) OR
    (cl.visitor_id IS NOT NULL AND cl.visitor_id = cp.visitor_id)
  ORDER BY 
    CASE WHEN cl.user_id = cp.user_id THEN 1 ELSE 2 END,
    CASE WHEN cl.crm_user_id = cp.crm_user_id THEN 1 ELSE 2 END
  LIMIT 1
)
WHERE cp.crm_lead_id IS NULL;

-- Stap 1.4: Update customer_profiles met crm_lead_id waar mogelijk via linked_visitor_ids
UPDATE customer_profiles cp
SET crm_lead_id = (
  SELECT cl.id FROM crm_leads cl
  WHERE cp.visitor_id = ANY(cl.linked_visitor_ids)
  LIMIT 1
)
WHERE cp.crm_lead_id IS NULL AND cp.visitor_id IS NOT NULL;