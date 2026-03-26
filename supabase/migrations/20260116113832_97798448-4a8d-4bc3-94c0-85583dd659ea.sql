-- Add hook_data column to content_items for Hook Lab output storage
ALTER TABLE public.content_items 
ADD COLUMN hook_data JSONB DEFAULT NULL;

COMMENT ON COLUMN public.content_items.hook_data IS 
'Stores Hook Lab output: generated_hooks (5 variations), selected_hook, selection_reason, all_variants';