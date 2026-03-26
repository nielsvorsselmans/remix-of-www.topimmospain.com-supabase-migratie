CREATE OR REPLACE FUNCTION public.auto_create_journey_milestones()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert orientatie milestones
  INSERT INTO public.journey_milestones (crm_lead_id, phase, template_key, title, description, order_index, customer_visible, admin_only, priority, completed_at)
  VALUES
    (NEW.id, 'orientatie', 'ori_lead_binnenkomst', 'Lead binnengekomen', 'Nieuwe lead is geregistreerd in het systeem', 1, false, true, 'high', NOW()),
    (NEW.id, 'orientatie', 'ori_call_gepland', 'Oriëntatiegesprek ingepland', 'Eerste kennismakingsgesprek is gepland', 2, false, true, 'high', NULL),
    (NEW.id, 'orientatie', 'ori_call_gevoerd', 'Oriëntatiegesprek gevoerd', 'Je hebt een kennismakingsgesprek gehad met een adviseur', 3, true, false, 'high', NULL),
    (NEW.id, 'orientatie', 'ori_uitnodiging_verstuurd', 'Portaaluitnodiging verstuurd', 'Uitnodiging voor het klantportaal is verstuurd', 4, false, true, 'medium', NULL),
    (NEW.id, 'orientatie', 'ori_account', 'Account aangemaakt', 'Je account is succesvol aangemaakt', 5, true, false, 'high', CASE WHEN NEW.user_id IS NOT NULL THEN NOW() ELSE NULL END),
    (NEW.id, 'orientatie', 'ori_profiel', 'Vragenlijst ingevuld', 'Beantwoord vragen over je situatie en voorkeuren', 6, true, false, 'high', NULL),
    (NEW.id, 'orientatie', 'ori_calculator', 'Calculator gebruikt', 'Bereken je potentiële rendement of kosten', 7, true, false, 'medium', NULL),
    (NEW.id, 'orientatie', 'ori_gids_gelezen', 'Oriëntatiegids gelezen', 'Lees je in over investeren in Spanje', 8, true, false, 'medium', NULL),
    (NEW.id, 'orientatie', 'ori_projecten_bekeken', '3+ projecten bekeken', 'Verken minimaal 3 projecten', 9, true, false, 'medium', NULL),
    (NEW.id, 'orientatie', 'ori_favoriet', 'Favoriet toegevoegd', 'Sla een interessant project op als favoriet', 10, true, false, 'medium', NULL),
    (NEW.id, 'orientatie', 'ori_kennismaking', 'Oriëntatiegesprek gepland', 'Plan een vrijblijvend gesprek met een adviseur', 11, true, false, 'high', NULL)
  ON CONFLICT (crm_lead_id, template_key) DO NOTHING;

  -- Insert selectie milestones
  INSERT INTO public.journey_milestones (crm_lead_id, phase, template_key, title, description, order_index, customer_visible, admin_only, priority)
  VALUES
    (NEW.id, 'selectie', 'sel_projecten_toegewezen', 'Projecten toegewezen', 'Adviseur heeft projecten voor je geselecteerd', 1, false, true, 'high'),
    (NEW.id, 'selectie', 'sel_shortlist', 'Shortlist samengesteld', 'Kies je favoriete projecten voor bezichtiging', 2, true, false, 'high'),
    (NEW.id, 'selectie', 'sel_vragen_beantwoord', 'Vragen beantwoord', 'Alle vragen over de projecten beantwoord', 3, true, false, 'medium'),
    (NEW.id, 'selectie', 'sel_beslissing', 'Klaar voor bezichtiging', 'Definitieve selectie gemaakt voor bezichtiging', 4, true, false, 'high')
  ON CONFLICT (crm_lead_id, template_key) DO NOTHING;

  -- Insert bezichtiging milestones
  INSERT INTO public.journey_milestones (crm_lead_id, phase, template_key, title, description, order_index, customer_visible, admin_only, priority)
  VALUES
    (NEW.id, 'bezichtiging', 'bez_reis_gepland', 'Bezichtiging ingepland', 'Bezichtigingsreis is gepland', 1, true, false, 'high'),
    (NEW.id, 'bezichtiging', 'bez_vlucht', 'Vluchten geregeld', 'Vluchten zijn geboekt en bevestigd', 2, false, true, 'medium'),
    (NEW.id, 'bezichtiging', 'bez_accommodatie', 'Accommodatie bevestigd', 'Verblijf is geregeld', 3, false, true, 'medium'),
    (NEW.id, 'bezichtiging', 'bez_planning_af', 'Bezichtigingsplanning compleet', 'Complete planning met alle bezichtigingen', 4, true, false, 'high'),
    (NEW.id, 'bezichtiging', 'bez_uitgevoerd', 'Bezichtigingen uitgevoerd', 'Alle geplande bezichtigingen zijn gedaan', 5, true, false, 'high'),
    (NEW.id, 'bezichtiging', 'bez_feedback', 'Feedback ontvangen', 'Klant heeft feedback gegeven na bezichtigingen', 6, false, true, 'medium')
  ON CONFLICT (crm_lead_id, template_key) DO NOTHING;

  -- Insert aankoop milestones
  INSERT INTO public.journey_milestones (crm_lead_id, phase, template_key, title, description, order_index, customer_visible, admin_only, priority)
  VALUES
    (NEW.id, 'aankoop', 'aank_keuze_gemaakt', 'Woningkeuze gemaakt', 'Klant heeft definitieve keuze gemaakt voor een woning', 1, true, false, 'high'),
    (NEW.id, 'aankoop', 'aank_reservatie', 'Reservatie geplaatst', 'Reserveringscontract is opgesteld', 2, true, false, 'high'),
    (NEW.id, 'aankoop', 'aank_aanbetaling', 'Aanbetaling voldaan', 'Eerste aanbetaling is ontvangen', 3, true, false, 'high'),
    (NEW.id, 'aankoop', 'aank_koopcontract', 'Koopcontract ondertekend', 'Koopcontract is door beide partijen ondertekend', 4, true, false, 'high'),
    (NEW.id, 'aankoop', 'aank_notaris', 'Notaris afspraak gepland', 'Afspraak met notaris is ingepland', 5, true, false, 'medium'),
    (NEW.id, 'aankoop', 'aank_financiering', 'Financiering afgerond', 'Hypotheek of financiering is rond', 6, true, false, 'medium')
  ON CONFLICT (crm_lead_id, template_key) DO NOTHING;

  -- Insert overdracht milestones
  INSERT INTO public.journey_milestones (crm_lead_id, phase, template_key, title, description, order_index, customer_visible, admin_only, priority)
  VALUES
    (NEW.id, 'overdracht', 'over_opleverdatum', 'Opleverdatum bevestigd', 'Verwachte opleverdatum is gecommuniceerd', 1, true, false, 'high'),
    (NEW.id, 'overdracht', 'over_eindinspectie', 'Eindinspectie gepland', 'Afspraak voor eindinspectie is gemaakt', 2, true, false, 'high'),
    (NEW.id, 'overdracht', 'over_snagging', 'Snagging lijst afgewerkt', 'Alle opleverpunten zijn gecontroleerd en afgehandeld', 3, true, false, 'medium'),
    (NEW.id, 'overdracht', 'over_sleuteloverdracht', 'Sleuteloverdracht', 'Sleutels zijn overgedragen aan de klant', 4, true, false, 'high'),
    (NEW.id, 'overdracht', 'over_notaris_akte', 'Notariële akte gepasseerd', 'Eigendomsoverdracht is officieel geregistreerd', 5, true, false, 'high')
  ON CONFLICT (crm_lead_id, template_key) DO NOTHING;

  -- Insert beheer milestones
  INSERT INTO public.journey_milestones (crm_lead_id, phase, template_key, title, description, order_index, customer_visible, admin_only, priority)
  VALUES
    (NEW.id, 'beheer', 'beh_verhuur_setup', 'Verhuur ingericht', 'Verhuurstrategie en inrichting is bepaald', 1, true, false, 'medium'),
    (NEW.id, 'beheer', 'beh_beheerder', 'Beheerder gekoppeld', 'Property manager is aangesteld', 2, true, false, 'medium'),
    (NEW.id, 'beheer', 'beh_eerste_boeking', 'Eerste boeking ontvangen', 'Eerste huuropbrengst is binnen', 3, true, false, 'medium'),
    (NEW.id, 'beheer', 'beh_review_gevraagd', 'Review gevraagd', 'Klant is gevraagd om ervaring te delen', 4, false, true, 'low')
  ON CONFLICT (crm_lead_id, template_key) DO NOTHING;

  -- Auto-create customer_profile voor nieuwe crm_lead
  INSERT INTO public.customer_profiles (crm_lead_id, user_id, crm_user_id, created_at)
  VALUES (NEW.id, NEW.user_id, NEW.crm_user_id, NOW())
  ON CONFLICT (crm_lead_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;