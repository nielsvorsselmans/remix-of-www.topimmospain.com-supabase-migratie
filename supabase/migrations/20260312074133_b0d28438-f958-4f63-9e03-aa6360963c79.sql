
-- Add milestone_group column
ALTER TABLE sale_milestones ADD COLUMN milestone_group TEXT;

-- Populate existing records based on template_key
UPDATE sale_milestones SET milestone_group = 'reservatiecontract' 
WHERE template_key IN ('res_koperdata', 'res_contract_upload', 'res_advocaat', 'res_klant_ondertekend', 'res_developer_ondertekend');

UPDATE sale_milestones SET milestone_group = 'financieel' 
WHERE template_key IN ('res_betaalplan', 'res_facturen', 'res_aanbetaling');

UPDATE sale_milestones SET milestone_group = 'extras' 
WHERE template_key IN ('res_extras');

UPDATE sale_milestones SET milestone_group = 'documenten_compleet' 
WHERE template_key IN ('koop_grondplan', 'koop_specificaties', 'koop_bouwvergunning', 'koop_kadastraal', 'koop_eigendomsregister', 'koop_bankgarantie');

UPDATE sale_milestones SET milestone_group = 'koopcontract_ondertekend' 
WHERE template_key IN ('koop_contract', 'koop_klant_ondertekend', 'koop_developer_ondertekend');

UPDATE sale_milestones SET milestone_group = 'technische_plannen' 
WHERE template_key IN ('voorb_elektriciteit', 'voorb_afmetingen');

UPDATE sale_milestones SET milestone_group = 'klant_voorbereid' 
WHERE template_key IN ('voorb_extras_docs', 'voorb_gesprek', 'voorb_aanpassingen');

UPDATE sale_milestones SET milestone_group = 'klant_akkoord' 
WHERE template_key IN ('akk_specs_compleet', 'akk_grondplan', 'akk_elektriciteit', 'akk_extras', 'akk_definitief');

UPDATE sale_milestones SET milestone_group = 'akkoord_verwerkt' 
WHERE template_key IN ('akk_doorgegeven');

UPDATE sale_milestones SET milestone_group = 'oplevering' 
WHERE template_key IN ('overd_snagging');
