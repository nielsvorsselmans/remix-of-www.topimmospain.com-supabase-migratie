-- Update all existing sale_milestones to be customer_visible by default
UPDATE sale_milestones SET customer_visible = true WHERE customer_visible = false;