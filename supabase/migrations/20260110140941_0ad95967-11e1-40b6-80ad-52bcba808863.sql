-- 1. Unique constraint toevoegen om duplicaten te voorkomen
ALTER TABLE conversations 
ADD CONSTRAINT conversations_source_unique 
UNIQUE (source_type, source_id);

-- 2. Trigger functie voor ghl_contact_notes
CREATE OR REPLACE FUNCTION sync_ghl_note_to_conversation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO conversations (source_type, source_id, crm_lead_id, raw_notes, processed)
  VALUES ('ghl_note', NEW.id, NEW.crm_lead_id, NEW.body, false)
  ON CONFLICT (source_type, source_id) 
  DO UPDATE SET raw_notes = EXCLUDED.raw_notes;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger functie voor ghl_contact_appointments (alleen met local_notes)
CREATE OR REPLACE FUNCTION sync_ghl_appointment_to_conversation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.local_notes IS NOT NULL AND NEW.local_notes != '' THEN
    INSERT INTO conversations (source_type, source_id, crm_lead_id, raw_notes, processed)
    VALUES ('ghl_appointment', NEW.id, NEW.crm_lead_id, NEW.local_notes, false)
    ON CONFLICT (source_type, source_id) 
    DO UPDATE SET raw_notes = EXCLUDED.raw_notes;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger functie voor manual_events
CREATE OR REPLACE FUNCTION sync_manual_event_to_conversation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.notes IS NOT NULL AND NEW.notes != '' THEN
    INSERT INTO conversations (source_type, source_id, crm_lead_id, raw_notes, processed)
    VALUES ('manual_event', NEW.id, NEW.crm_lead_id, NEW.notes, false)
    ON CONFLICT (source_type, source_id) 
    DO UPDATE SET raw_notes = EXCLUDED.raw_notes;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Triggers koppelen aan tabellen
CREATE TRIGGER sync_ghl_note_trigger
AFTER INSERT OR UPDATE ON ghl_contact_notes
FOR EACH ROW EXECUTE FUNCTION sync_ghl_note_to_conversation();

CREATE TRIGGER sync_ghl_appointment_trigger
AFTER INSERT OR UPDATE ON ghl_contact_appointments
FOR EACH ROW EXECUTE FUNCTION sync_ghl_appointment_to_conversation();

CREATE TRIGGER sync_manual_event_trigger
AFTER INSERT OR UPDATE ON manual_events
FOR EACH ROW EXECUTE FUNCTION sync_manual_event_to_conversation();

-- 6. Initiële sync van bestaande data
INSERT INTO conversations (source_type, source_id, crm_lead_id, raw_notes, processed)
SELECT 'ghl_note', id, crm_lead_id, body, false
FROM ghl_contact_notes
WHERE body IS NOT NULL AND body != ''
ON CONFLICT (source_type, source_id) DO NOTHING;

INSERT INTO conversations (source_type, source_id, crm_lead_id, raw_notes, processed)
SELECT 'ghl_appointment', id, crm_lead_id, local_notes, false
FROM ghl_contact_appointments
WHERE local_notes IS NOT NULL AND local_notes != ''
ON CONFLICT (source_type, source_id) DO NOTHING;

INSERT INTO conversations (source_type, source_id, crm_lead_id, raw_notes, processed)
SELECT 'manual_event', id, crm_lead_id, notes, false
FROM manual_events
WHERE notes IS NOT NULL AND notes != ''
ON CONFLICT (source_type, source_id) DO NOTHING;