-- Trigger to auto-create journey milestones when a new crm_lead is inserted
CREATE OR REPLACE FUNCTION public.auto_create_journey_milestones()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert orientatie milestones
  INSERT INTO public.journey_milestones (crm_lead_id, phase, template_key, title, description, order_index, customer_visible, admin_only, priority, completed_at)
  VALUES
    -- Pre-account milestones (admin only)
    (NEW.id, 'orientatie', 'ori_lead_binnenkomst', 'Lead binnengekomen', 'Nieuwe lead is geregistreerd in het systeem', 1, false, true, 'high', NOW()), -- Auto-complete on insert
    (NEW.id, 'orientatie', 'ori_call_gepland', 'Oriëntatiegesprek ingepland', 'Eerste kennismakingsgesprek is gepland', 2, false, true, 'high', NULL),
    (NEW.id, 'orientatie', 'ori_call_gevoerd', 'Oriëntatiegesprek gevoerd', 'Kennismakingsgesprek heeft plaatsgevonden', 3, false, true, 'high', NULL),
    (NEW.id, 'orientatie', 'ori_uitnodiging_verstuurd', 'Portaaluitnodiging verstuurd', 'Uitnodiging voor het klantportaal is verstuurd', 4, false, true, 'medium', NULL),
    -- Customer-visible milestones
    (NEW.id, 'orientatie', 'ori_account', 'Account aangemaakt', 'Je account is succesvol aangemaakt', 5, true, false, 'high', CASE WHEN NEW.user_id IS NOT NULL THEN NOW() ELSE NULL END),
    (NEW.id, 'orientatie', 'ori_profiel', 'Vragenlijst ingevuld', 'Beantwoord vragen over je situatie en voorkeuren', 6, true, false, 'high', NULL),
    (NEW.id, 'orientatie', 'ori_gids_gelezen', 'Oriëntatiegids gelezen', 'Lees je in over investeren in Spanje', 7, true, false, 'medium', NULL),
    (NEW.id, 'orientatie', 'ori_projecten_bekeken', '3+ projecten bekeken', 'Verken minimaal 3 projecten', 8, true, false, 'medium', NULL),
    (NEW.id, 'orientatie', 'ori_favoriet', 'Favoriet toegevoegd', 'Sla een interessant project op als favoriet', 9, true, false, 'medium', NULL),
    (NEW.id, 'orientatie', 'ori_kennismaking', 'Oriëntatiegesprek gevoerd', 'Bespreek je situatie met een adviseur', 10, true, false, 'high', NULL);

  -- Insert selectie milestones
  INSERT INTO public.journey_milestones (crm_lead_id, phase, template_key, title, description, order_index, customer_visible, admin_only, priority)
  VALUES
    (NEW.id, 'selectie', 'sel_projecten_toegewezen', 'Projecten toegewezen', 'Adviseur heeft projecten voor je geselecteerd', 1, false, true, 'high'),
    (NEW.id, 'selectie', 'sel_shortlist', 'Shortlist samengesteld', 'Kies je favoriete projecten voor bezichtiging', 2, true, false, 'high'),
    (NEW.id, 'selectie', 'sel_vragen_beantwoord', 'Vragen beantwoord', 'Alle vragen over de projecten beantwoord', 3, true, false, 'medium'),
    (NEW.id, 'selectie', 'sel_beslissing', 'Klaar voor bezichtiging', 'Definitieve selectie gemaakt voor bezichtiging', 4, true, false, 'high');

  -- Insert bezichtiging milestones
  INSERT INTO public.journey_milestones (crm_lead_id, phase, template_key, title, description, order_index, customer_visible, admin_only, priority)
  VALUES
    (NEW.id, 'bezichtiging', 'bez_reis_gepland', 'Bezichtiging ingepland', 'Bezichtigingsreis is gepland', 1, true, false, 'high'),
    (NEW.id, 'bezichtiging', 'bez_vlucht', 'Vluchten geregeld', 'Vluchten zijn geboekt en bevestigd', 2, false, true, 'medium'),
    (NEW.id, 'bezichtiging', 'bez_accommodatie', 'Accommodatie bevestigd', 'Verblijf is geregeld', 3, false, true, 'medium'),
    (NEW.id, 'bezichtiging', 'bez_planning_af', 'Bezichtigingsplanning compleet', 'Complete planning met alle bezichtigingen', 4, true, false, 'high'),
    (NEW.id, 'bezichtiging', 'bez_uitgevoerd', 'Bezichtigingen uitgevoerd', 'Alle geplande bezichtigingen zijn gedaan', 5, true, false, 'high'),
    (NEW.id, 'bezichtiging', 'bez_feedback', 'Feedback ontvangen', 'Klant heeft feedback gegeven na bezichtigingen', 6, false, true, 'medium');

  RETURN NEW;
END;
$$;

-- Create trigger for auto-creating milestones on crm_lead insert
DROP TRIGGER IF EXISTS trigger_auto_create_journey_milestones ON public.crm_leads;
CREATE TRIGGER trigger_auto_create_journey_milestones
  AFTER INSERT ON public.crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_journey_milestones();

-- Update trigger for auto-complete ori_account when user_id is linked
CREATE OR REPLACE FUNCTION public.trigger_journey_account_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When user_id is set (account linked)
  IF NEW.user_id IS NOT NULL AND (OLD.user_id IS NULL OR OLD IS NULL) THEN
    PERFORM auto_complete_journey_milestone(NEW.id, 'ori_account');
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for account linking
DROP TRIGGER IF EXISTS trigger_journey_account_linked ON public.crm_leads;
CREATE TRIGGER trigger_journey_account_linked
  AFTER UPDATE OF user_id ON public.crm_leads
  FOR EACH ROW
  WHEN (OLD.user_id IS NULL AND NEW.user_id IS NOT NULL)
  EXECUTE FUNCTION public.trigger_journey_account_created();

-- Auto-complete ori_call_gepland when appointment is created in ghl_contact_appointments
CREATE OR REPLACE FUNCTION public.trigger_journey_call_planned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM auto_complete_journey_milestone(NEW.crm_lead_id, 'ori_call_gepland');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_journey_call_planned ON public.ghl_contact_appointments;
CREATE TRIGGER trigger_journey_call_planned
  AFTER INSERT ON public.ghl_contact_appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_journey_call_planned();