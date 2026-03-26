-- Migrate ori_kennismaking milestones to ori_call_gevoerd
-- First, update any ori_kennismaking entries to ori_call_gevoerd if ori_call_gevoerd doesn't exist for that lead
UPDATE journey_milestones jm1
SET 
  template_key = 'ori_call_gevoerd',
  title = 'Oriëntatiegesprek gevoerd',
  description = 'Je hebt een kennismakingsgesprek gehad met een adviseur',
  order_index = 3,
  customer_visible = true,
  admin_only = false
WHERE template_key = 'ori_kennismaking'
AND NOT EXISTS (
  SELECT 1 FROM journey_milestones jm2 
  WHERE jm2.crm_lead_id = jm1.crm_lead_id 
  AND jm2.template_key = 'ori_call_gevoerd'
);

-- For leads that have both, merge: keep ori_call_gevoerd, copy completed_at if ori_kennismaking was completed
UPDATE journey_milestones jm1
SET 
  completed_at = COALESCE(jm1.completed_at, (
    SELECT jm2.completed_at 
    FROM journey_milestones jm2 
    WHERE jm2.crm_lead_id = jm1.crm_lead_id 
    AND jm2.template_key = 'ori_kennismaking'
  )),
  customer_visible = true,
  admin_only = false,
  description = 'Je hebt een kennismakingsgesprek gehad met een adviseur'
WHERE template_key = 'ori_call_gevoerd'
AND EXISTS (
  SELECT 1 FROM journey_milestones jm2 
  WHERE jm2.crm_lead_id = jm1.crm_lead_id 
  AND jm2.template_key = 'ori_kennismaking'
);

-- Delete the duplicate ori_kennismaking entries
DELETE FROM journey_milestones WHERE template_key = 'ori_kennismaking';