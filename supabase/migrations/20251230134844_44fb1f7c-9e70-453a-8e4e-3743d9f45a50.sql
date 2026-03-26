-- User ID kolom toevoegen voor koppeling met account
ALTER TABLE info_evening_registrations 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Index voor snellere lookups
CREATE INDEX IF NOT EXISTS idx_info_evening_registrations_user_id 
ON info_evening_registrations(user_id);

-- Trigger: link registratie aan user bij profiel aanmaak
CREATE OR REPLACE FUNCTION link_infoavond_registration_to_user()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE info_evening_registrations
  SET user_id = NEW.id
  WHERE LOWER(email) = LOWER(NEW.email)
    AND user_id IS NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_profile_created_link_infoavond ON profiles;

-- Create trigger
CREATE TRIGGER on_profile_created_link_infoavond
AFTER INSERT ON profiles
FOR EACH ROW
EXECUTE FUNCTION link_infoavond_registration_to_user();