-- Add model_id column to ai_prompts table for dynamic model selection
ALTER TABLE public.ai_prompts 
ADD COLUMN IF NOT EXISTS model_id TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.ai_prompts.model_id IS 'The AI model identifier to use for this prompt stage (e.g., google/gemini-2.5-flash)';