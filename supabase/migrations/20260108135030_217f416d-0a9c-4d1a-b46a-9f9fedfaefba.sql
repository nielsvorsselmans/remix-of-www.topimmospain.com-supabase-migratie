
-- ============================================
-- FASE 1: Data Integriteit - UNIQUE Constraint
-- ============================================

-- Stap 1: Ontkoppel incorrecte CRM leads van user db8a2190-c6f7-4d4c-96f9-6c91004c8e5c
-- De juiste lead is 5b46d1e9-10ce-4460-a4be-e92ac5daf2d5 (niels1324@gmail.com)
UPDATE crm_leads 
SET user_id = NULL, updated_at = NOW()
WHERE user_id = 'db8a2190-c6f7-4d4c-96f9-6c91004c8e5c'
AND id IN (
  '0b4c7a6c-7b9c-4cc6-aac2-27b63f1b3135',  -- Harry VAN DE WALLE
  '1e63db12-da5c-46ef-b74b-1c2dabc49126',  -- Stéphanie Colders
  '6bd42ec2-6b40-4065-95b3-2f835f210f43'   -- Rita Woldringh
);

-- Stap 2: Voeg UNIQUE constraint toe op user_id (alleen voor NOT NULL waarden)
CREATE UNIQUE INDEX IF NOT EXISTS crm_leads_user_id_unique 
ON crm_leads(user_id) 
WHERE user_id IS NOT NULL;

-- ============================================
-- FASE 3: Automatische Cleanup Functions
-- ============================================

-- Functie voor cleanup van verlopen OTP codes
CREATE OR REPLACE FUNCTION cleanup_expired_otp_codes()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM otp_codes 
  WHERE expires_at < NOW() 
  AND used_at IS NULL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Cleaned up % expired OTP codes', deleted_count;
  RETURN deleted_count;
END;
$$;

-- Functie voor cleanup van orphaned customer_profiles (>90 dagen oud, geen koppeling)
CREATE OR REPLACE FUNCTION cleanup_orphaned_customer_profiles()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM customer_profiles
  WHERE user_id IS NULL 
  AND crm_lead_id IS NULL
  AND crm_user_id IS NULL
  AND created_at < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Cleaned up % orphaned customer profiles', deleted_count;
  RETURN deleted_count;
END;
$$;
