-- Fase 1: Verwijder bestaande duplicaten (behoud record met meeste data)

-- Duplicaat 1: gianni.piazza@performanagement.nl - Verwijder d10ec55a (behoud 4969b468 met GHL)
DELETE FROM crm_leads WHERE id = 'd10ec55a-6c53-45a0-9975-80bdaba2c369';

-- Duplicaat 2: vorsselmanslars@gmail.com - Verwijder b26107d0 (behoud 7e08f4bf met correcte GHL)
DELETE FROM crm_leads WHERE id = 'b26107d0-ea97-4b48-9003-f46f9da21448';

-- Duplicaat 3: yannick.braem23@hotmail.com - Eerst merge user_id naar GHL record, dan verwijder duplicaat
UPDATE crm_leads 
SET user_id = '1ce2b528-e770-4b17-864f-076a717b9ff8'
WHERE id = '4488eda6-2858-40e3-ab9d-93626f3ed7ea'
  AND user_id IS NULL;

DELETE FROM crm_leads WHERE id = 'd459de13-3da5-4700-8d8e-19f552be31a7';

-- Fase 1.2: Standaardiseer crm_user_id formaten - raw GHL IDs krijgen ghl_ prefix
UPDATE crm_leads 
SET crm_user_id = 'ghl_' || crm_user_id
WHERE crm_user_id NOT LIKE 'ghl_%'
  AND crm_user_id NOT LIKE 'usr_%'
  AND crm_user_id NOT LIKE 'webinar-%'
  AND crm_user_id NOT LIKE 'website-%'
  AND crm_user_id NOT LIKE 'cobuyer_%'
  AND ghl_contact_id IS NOT NULL
  AND crm_user_id IS NOT NULL;

-- Fase 2: Database Constraints voor duplicaatpreventie

-- 2.1 Unique constraint op email (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS crm_leads_email_unique_lower 
ON crm_leads (LOWER(email)) 
WHERE email IS NOT NULL;

-- 2.2 Unique constraint op ghl_contact_id
CREATE UNIQUE INDEX IF NOT EXISTS crm_leads_ghl_contact_id_unique 
ON crm_leads (ghl_contact_id) 
WHERE ghl_contact_id IS NOT NULL;