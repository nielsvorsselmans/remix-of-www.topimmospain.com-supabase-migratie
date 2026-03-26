-- Smart backfill: Create journey milestones ONLY for leads without sales
-- Also auto-complete milestones based on existing data

DO $$
DECLARE
  lead_record RECORD;
  template RECORD;
  has_appointment BOOLEAN;
  has_account BOOLEAN;
BEGIN
  -- Loop through all leads without a sale (not in sale_customers)
  FOR lead_record IN 
    SELECT cl.id, cl.user_id, cl.journey_phase
    FROM crm_leads cl
    WHERE NOT EXISTS (
      SELECT 1 FROM sale_customers sc WHERE sc.crm_lead_id = cl.id
    )
    AND cl.journey_phase IN ('orientatie', 'selectie', 'bezichtiging')
    -- Only leads that don't have milestones yet
    AND NOT EXISTS (
      SELECT 1 FROM journey_milestones jm WHERE jm.crm_lead_id = cl.id
    )
  LOOP
    -- Check if lead has account
    has_account := lead_record.user_id IS NOT NULL;
    
    -- Check if lead has appointments
    SELECT EXISTS(
      SELECT 1 FROM ghl_contact_appointments gca WHERE gca.crm_lead_id = lead_record.id
    ) INTO has_appointment;

    -- Insert orientatie milestones
    INSERT INTO journey_milestones (crm_lead_id, phase, template_key, title, description, order_index, customer_visible, admin_only, priority, completed_at)
    VALUES
      -- Pre-account milestones
      (lead_record.id, 'orientatie', 'ori_lead_binnenkomst', 'Lead binnengekomen', 'Nieuwe lead is geregistreerd in het systeem', 1, false, true, 'high', now()),
      (lead_record.id, 'orientatie', 'ori_call_gepland', 'Oriëntatiegesprek ingepland', 'Eerste kennismakingsgesprek is gepland', 2, false, true, 'high', CASE WHEN has_appointment THEN now() ELSE NULL END),
      (lead_record.id, 'orientatie', 'ori_call_gevoerd', 'Oriëntatiegesprek gevoerd', 'Kennismakingsgesprek heeft plaatsgevonden', 3, false, true, 'high', NULL),
      (lead_record.id, 'orientatie', 'ori_uitnodiging_verstuurd', 'Portaaluitnodiging verstuurd', 'Uitnodiging voor het klantportaal is verstuurd', 4, false, true, 'medium', NULL),
      -- Customer-visible milestones
      (lead_record.id, 'orientatie', 'ori_account', 'Account aangemaakt', 'Je account is succesvol aangemaakt', 5, true, false, 'high', CASE WHEN has_account THEN now() ELSE NULL END),
      (lead_record.id, 'orientatie', 'ori_profiel', 'Vragenlijst ingevuld', 'Beantwoord vragen over je situatie en voorkeuren', 6, true, false, 'high', NULL),
      (lead_record.id, 'orientatie', 'ori_gids_gelezen', 'Oriëntatiegids gelezen', 'Lees je in over investeren in Spanje', 7, true, false, 'medium', NULL),
      (lead_record.id, 'orientatie', 'ori_projecten_bekeken', '3+ projecten bekeken', 'Verken minimaal 3 projecten', 8, true, false, 'medium', NULL),
      (lead_record.id, 'orientatie', 'ori_favoriet', 'Favoriet toegevoegd', 'Sla een interessant project op als favoriet', 9, true, false, 'medium', NULL),
      (lead_record.id, 'orientatie', 'ori_kennismaking', 'Oriëntatiegesprek gevoerd', 'Bespreek je situatie met een adviseur', 10, true, false, 'high', NULL);

    -- Insert selectie milestones
    INSERT INTO journey_milestones (crm_lead_id, phase, template_key, title, description, order_index, customer_visible, admin_only, priority)
    VALUES
      (lead_record.id, 'selectie', 'sel_projecten_toegewezen', 'Projecten toegewezen', 'Adviseur heeft projecten voor je geselecteerd', 1, false, true, 'high'),
      (lead_record.id, 'selectie', 'sel_shortlist', 'Shortlist samengesteld', 'Kies je favoriete projecten voor bezichtiging', 2, true, false, 'high'),
      (lead_record.id, 'selectie', 'sel_vragen_beantwoord', 'Vragen beantwoord', 'Alle vragen over de projecten beantwoord', 3, true, false, 'medium'),
      (lead_record.id, 'selectie', 'sel_beslissing', 'Klaar voor bezichtiging', 'Definitieve selectie gemaakt voor bezichtiging', 4, true, false, 'high');

    -- Insert bezichtiging milestones
    INSERT INTO journey_milestones (crm_lead_id, phase, template_key, title, description, order_index, customer_visible, admin_only, priority)
    VALUES
      (lead_record.id, 'bezichtiging', 'bez_reis_gepland', 'Bezichtiging ingepland', 'Bezichtigingsreis is gepland', 1, true, false, 'high'),
      (lead_record.id, 'bezichtiging', 'bez_vlucht', 'Vluchten geregeld', 'Vluchten zijn geboekt en bevestigd', 2, false, true, 'medium'),
      (lead_record.id, 'bezichtiging', 'bez_accommodatie', 'Accommodatie bevestigd', 'Verblijf is geregeld', 3, false, true, 'medium'),
      (lead_record.id, 'bezichtiging', 'bez_planning_af', 'Bezichtigingsplanning compleet', 'Complete planning met alle bezichtigingen', 4, true, false, 'high'),
      (lead_record.id, 'bezichtiging', 'bez_uitgevoerd', 'Bezichtigingen uitgevoerd', 'Alle geplande bezichtigingen zijn gedaan', 5, true, false, 'high'),
      (lead_record.id, 'bezichtiging', 'bez_feedback', 'Feedback ontvangen', 'Klant heeft feedback gegeven na bezichtigingen', 6, false, true, 'medium');
  END LOOP;
END $$;