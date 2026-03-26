-- Voeg aankoop/overdracht/beheer toe aan leads die wel oriëntatie hebben maar niet aankoop
INSERT INTO journey_milestones (crm_lead_id, phase, template_key, title, description, order_index, customer_visible, admin_only, priority)
SELECT cl.id, phase, template_key, title, description, order_index, customer_visible, admin_only, priority
FROM crm_leads cl
CROSS JOIN (
  VALUES 
    ('aankoop', 'aank_keuze_gemaakt', 'Woningkeuze gemaakt', 'Klant heeft definitieve keuze gemaakt voor een woning', 1, true, false, 'high'),
    ('aankoop', 'aank_reservatie', 'Reservatie geplaatst', 'Reserveringscontract is opgesteld', 2, true, false, 'high'),
    ('aankoop', 'aank_aanbetaling', 'Aanbetaling voldaan', 'Eerste aanbetaling is ontvangen', 3, true, false, 'high'),
    ('aankoop', 'aank_koopcontract', 'Koopcontract ondertekend', 'Koopcontract is door beide partijen ondertekend', 4, true, false, 'high'),
    ('aankoop', 'aank_notaris', 'Notaris afspraak gepland', 'Afspraak met notaris is ingepland', 5, true, false, 'medium'),
    ('aankoop', 'aank_financiering', 'Financiering afgerond', 'Hypotheek of financiering is rond', 6, true, false, 'medium'),
    ('overdracht', 'over_opleverdatum', 'Opleverdatum bevestigd', 'Verwachte opleverdatum is gecommuniceerd', 1, true, false, 'high'),
    ('overdracht', 'over_eindinspectie', 'Eindinspectie gepland', 'Afspraak voor eindinspectie is gemaakt', 2, true, false, 'high'),
    ('overdracht', 'over_snagging', 'Snagging lijst afgewerkt', 'Alle opleverpunten zijn gecontroleerd en afgehandeld', 3, true, false, 'medium'),
    ('overdracht', 'over_sleuteloverdracht', 'Sleuteloverdracht', 'Sleutels zijn overgedragen aan de klant', 4, true, false, 'high'),
    ('overdracht', 'over_notaris_akte', 'Notariële akte gepasseerd', 'Eigendomsoverdracht is officieel geregistreerd', 5, true, false, 'high'),
    ('beheer', 'beh_verhuur_setup', 'Verhuur ingericht', 'Verhuurstrategie en inrichting is bepaald', 1, true, false, 'medium'),
    ('beheer', 'beh_beheerder', 'Beheerder gekoppeld', 'Property manager is aangesteld', 2, true, false, 'medium'),
    ('beheer', 'beh_eerste_boeking', 'Eerste boeking ontvangen', 'Eerste huuropbrengst is binnen', 3, true, false, 'medium'),
    ('beheer', 'beh_review_gevraagd', 'Review gevraagd', 'Klant is gevraagd om ervaring te delen', 4, false, true, 'low')
) AS templates(phase, template_key, title, description, order_index, customer_visible, admin_only, priority)
WHERE EXISTS (SELECT 1 FROM journey_milestones jm WHERE jm.crm_lead_id = cl.id AND jm.phase = 'orientatie')
AND NOT EXISTS (SELECT 1 FROM journey_milestones jm WHERE jm.crm_lead_id = cl.id AND jm.phase = 'aankoop');