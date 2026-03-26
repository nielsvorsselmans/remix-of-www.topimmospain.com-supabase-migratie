-- Add user_id and invite_code to partners table
ALTER TABLE partners ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS partner_invite_code text UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_partners_user_id ON partners(user_id);
CREATE INDEX IF NOT EXISTS idx_partners_invite_code ON partners(partner_invite_code);

-- Create partner_lead_notes table for partners to track their leads
CREATE TABLE IF NOT EXISTS partner_lead_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES partners(id) ON DELETE CASCADE NOT NULL,
  crm_lead_id uuid REFERENCES crm_leads(id) ON DELETE CASCADE NOT NULL,
  note text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS on partner_lead_notes
ALTER TABLE partner_lead_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Partners can only view their own referrals
CREATE POLICY "Partners can view their own referrals"
ON partner_referrals
FOR SELECT
USING (
  partner_id IN (
    SELECT id FROM partners WHERE user_id = auth.uid()
  )
);

-- RLS Policy: Partners can view leads that came via their referrals
CREATE POLICY "Partners can view their referred leads"
ON crm_leads
FOR SELECT
USING (
  referred_by_partner_id IN (
    SELECT id FROM partners WHERE user_id = auth.uid()
  )
);

-- RLS Policy: Partners can manage their own notes
CREATE POLICY "Partners can view their own notes"
ON partner_lead_notes
FOR SELECT
USING (
  partner_id IN (
    SELECT id FROM partners WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Partners can insert their own notes"
ON partner_lead_notes
FOR INSERT
WITH CHECK (
  partner_id IN (
    SELECT id FROM partners WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Partners can update their own notes"
ON partner_lead_notes
FOR UPDATE
USING (
  partner_id IN (
    SELECT id FROM partners WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Partners can delete their own notes"
ON partner_lead_notes
FOR DELETE
USING (
  partner_id IN (
    SELECT id FROM partners WHERE user_id = auth.uid()
  )
);

-- Trigger for updating updated_at on partner_lead_notes
CREATE TRIGGER update_partner_lead_notes_updated_at
BEFORE UPDATE ON partner_lead_notes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();