-- Fix the overly permissive RLS policy on appointment_rooms
-- Drop the policy that allows anyone to read all appointment rooms
DROP POLICY IF EXISTS "Users can read their own appointment rooms" ON appointment_rooms;

-- Create a proper policy that restricts access to the contact's own appointments or admins
CREATE POLICY "Users can read their own appointment rooms" ON appointment_rooms
  FOR SELECT USING (
    contact_email = auth.jwt()->>'email' OR
    has_role(auth.uid(), 'admin'::app_role)
  );