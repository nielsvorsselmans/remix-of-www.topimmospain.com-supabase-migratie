-- Add price_changes column to sync_logs table
ALTER TABLE public.sync_logs 
ADD COLUMN IF NOT EXISTS price_changes INTEGER DEFAULT 0;