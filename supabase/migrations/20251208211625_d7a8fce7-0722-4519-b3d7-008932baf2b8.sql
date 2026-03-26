-- Fix customer_profiles RLS policy vulnerability
-- The old policy allowed anyone to read profiles if visitor_id or crm_user_id was NOT NULL on the row
-- This exposed all customer data to unauthorized access

-- Drop the flawed policy
DROP POLICY IF EXISTS "Users can view own profile" ON customer_profiles;

-- Create secure policy: only authenticated users can view their own profile
-- Anonymous visitor data is accessed via service_role edge functions only
CREATE POLICY "Users can view own profile" ON customer_profiles
  FOR SELECT USING (auth.uid() = user_id);

-- Also add UPDATE policy so users can update their own profiles
DROP POLICY IF EXISTS "Users can update own profile" ON customer_profiles;
CREATE POLICY "Users can update own profile" ON customer_profiles
  FOR UPDATE USING (auth.uid() = user_id);