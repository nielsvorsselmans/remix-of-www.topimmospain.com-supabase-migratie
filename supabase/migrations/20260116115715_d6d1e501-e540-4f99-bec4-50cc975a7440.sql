-- Add gatekeeper_data column for Strategic Gatekeeper (Agent S) review output
ALTER TABLE public.content_items 
ADD COLUMN gatekeeper_data JSONB DEFAULT NULL;

COMMENT ON COLUMN public.content_items.gatekeeper_data IS 
'Strategic Gatekeeper review: status (APPROVED/REJECTED), reasoning, feedback_for_editor';