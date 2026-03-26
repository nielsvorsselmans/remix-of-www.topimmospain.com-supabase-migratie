-- Fase 1: Database & Data Setup

-- 1.1 Partners tabel uitbreiden met referral velden
ALTER TABLE partners 
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS landing_page_title TEXT,
  ADD COLUMN IF NOT EXISTS landing_page_intro TEXT,
  ADD COLUMN IF NOT EXISTS show_on_overview BOOLEAN DEFAULT true;

-- Index voor snelle slug lookups
CREATE INDEX IF NOT EXISTS idx_partners_slug ON partners(slug);
CREATE INDEX IF NOT EXISTS idx_partners_referral_code ON partners(referral_code);

-- 1.2 Partner tracking tabel aanmaken
CREATE TABLE IF NOT EXISTS partner_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
  visitor_id TEXT,
  user_id UUID,
  crm_lead_id UUID REFERENCES crm_leads(id) ON DELETE SET NULL,
  first_visit_at TIMESTAMPTZ DEFAULT now(),
  last_visit_at TIMESTAMPTZ DEFAULT now(),
  total_visits INTEGER DEFAULT 1,
  total_page_views INTEGER DEFAULT 0,
  converted_to_lead BOOLEAN DEFAULT false,
  converted_at TIMESTAMPTZ,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE partner_referrals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for partner_referrals
CREATE POLICY "Admins can manage all partner referrals"
  ON partner_referrals
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage partner referrals"
  ON partner_referrals
  FOR ALL
  USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Indexes voor performance
CREATE INDEX IF NOT EXISTS idx_partner_referrals_partner_id ON partner_referrals(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_referrals_visitor_id ON partner_referrals(visitor_id);
CREATE INDEX IF NOT EXISTS idx_partner_referrals_user_id ON partner_referrals(user_id);
CREATE INDEX IF NOT EXISTS idx_partner_referrals_crm_lead_id ON partner_referrals(crm_lead_id);

-- Trigger voor updated_at
CREATE OR REPLACE TRIGGER update_partner_referrals_updated_at
  BEFORE UPDATE ON partner_referrals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 1.3 CRM leads koppelen aan partners
ALTER TABLE crm_leads 
  ADD COLUMN IF NOT EXISTS referred_by_partner_id UUID REFERENCES partners(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_crm_leads_referred_by_partner ON crm_leads(referred_by_partner_id);