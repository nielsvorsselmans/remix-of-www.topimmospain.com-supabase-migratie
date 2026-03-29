-- Fix the overly permissive RLS policy on appointment_rooms
-- NOTE(P2): appointment_rooms has no CREATE TABLE migration; table must be recreated manually in Phase 2.
-- This block skips silently if the table does not exist yet.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'appointment_rooms'
  ) THEN
    DROP POLICY IF EXISTS "Users can read their own appointment rooms" ON appointment_rooms;

    CREATE POLICY "Users can read their own appointment rooms" ON appointment_rooms
      FOR SELECT USING (
        contact_email = auth.jwt()->>'email' OR
        has_role(auth.uid(), 'admin'::app_role)
      );
  END IF;
END $$;