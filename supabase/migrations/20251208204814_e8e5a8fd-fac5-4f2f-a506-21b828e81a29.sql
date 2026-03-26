-- Add magic link tracking columns to crm_leads
ALTER TABLE public.crm_leads 
ADD COLUMN IF NOT EXISTS last_magic_link_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS magic_link_sent_count INTEGER DEFAULT 0;